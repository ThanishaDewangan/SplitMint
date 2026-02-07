"use client";

import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";

type Participant = {
  id: string;
  name: string;
  color: string | null;
};

type Share = { participantId: string; amount: number; percentage?: number | null; participant: Participant };

type Expense = {
  id: string;
  description: string;
  amount: number;
  date: string;
  payerId: string;
  splitMode: string;
  shares: Share[];
};

type MintSensePrefill = {
  description: string;
  amount?: number;
  payerName: string;
  splitMode: "EQUAL" | "CUSTOM_AMOUNT" | "PERCENTAGE";
};

export function ExpenseForm({
  groupId,
  participants,
  expense,
  mintsensePrefill,
}: {
  groupId: string;
  participants: Participant[];
  expense?: Expense;
  mintsensePrefill?: MintSensePrefill;
}) {
  const router = useRouter();
  const isEdit = !!expense;

  const initialPayerId =
    expense?.payerId ??
    (mintsensePrefill?.payerName
      ? participants.find(
          (p) =>
            p.name.toLowerCase() === mintsensePrefill.payerName.toLowerCase()
        )?.id ?? participants[0]?.id
      : participants[0]?.id) ??
    "";

  const [description, setDescription] = useState(
    expense?.description ?? mintsensePrefill?.description ?? ""
  );
  const [amount, setAmount] = useState(
    expense?.amount?.toString() ??
      (mintsensePrefill?.amount != null ? mintsensePrefill.amount.toString() : "")
  );
  const [date, setDate] = useState(
    expense?.date
      ? new Date(expense.date).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  );
  const [payerId, setPayerId] = useState(initialPayerId);
  const [splitMode, setSplitMode] = useState<"EQUAL" | "CUSTOM_AMOUNT" | "PERCENTAGE">(
    (expense?.splitMode as "EQUAL" | "CUSTOM_AMOUNT" | "PERCENTAGE") ??
      mintsensePrefill?.splitMode ??
      "EQUAL"
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(
    expense?.shares?.map((s) => s.participantId) ?? participants.map((p) => p.id)
  );
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>(() => {
    const r: Record<string, string> = {};
    if (expense?.shares) {
      expense.shares.forEach((s) => {
        r[s.participantId] = s.amount.toString();
      });
    }
    return r;
  });
  const [percentages, setPercentages] = useState<Record<string, string>>(() => {
    const r: Record<string, string> = {};
    if (expense?.shares) {
      expense.shares.forEach((s) => {
        if (s.percentage != null) r[s.participantId] = s.percentage.toString();
      });
    }
    return r;
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const amountNum = useMemo(() => parseFloat(amount) || 0, [amount]);
  const equalShare = selectedIds.length > 0 ? amountNum / selectedIds.length : 0;

  const toggleParticipant = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const body = useMemo(() => {
    const base = {
      description,
      amount: amountNum,
      date: new Date(date).toISOString(),
      payerId,
      splitMode,
      participantIds: selectedIds,
    };
    if (splitMode === "CUSTOM_AMOUNT") {
      const custom: Record<string, number> = {};
      selectedIds.forEach((pid) => {
        const v = parseFloat(customAmounts[pid] ?? "0") || 0;
        custom[pid] = v;
      });
      return { ...base, customAmounts: custom };
    }
    if (splitMode === "PERCENTAGE") {
      const pct: Record<string, number> = {};
      selectedIds.forEach((pid) => {
        const v = parseFloat(percentages[pid] ?? "0") || 0;
        pct[pid] = v;
      });
      return { ...base, percentages: pct };
    }
    return base;
  }, [description, amountNum, date, payerId, splitMode, selectedIds, customAmounts, percentages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (amountNum <= 0) {
      setError("Amount must be positive");
      return;
    }
    if (selectedIds.length === 0) {
      setError("Select at least one participant");
      return;
    }
    if (!selectedIds.includes(payerId)) {
      setError("Payer must be among selected participants");
      return;
    }
    if (splitMode === "PERCENTAGE") {
      const sum = selectedIds.reduce(
        (s, pid) => s + (parseFloat(percentages[pid] ?? "0") || 0),
        0
      );
      if (Math.abs(sum - 100) > 0.01) {
        setError("Percentages must sum to 100");
        return;
      }
    }
    if (splitMode === "CUSTOM_AMOUNT") {
      const sum = selectedIds.reduce(
        (s, pid) => s + (parseFloat(customAmounts[pid] ?? "0") || 0),
        0
      );
      if (Math.abs(sum - amountNum) > 0.02) {
        setError("Custom amounts must sum to expense amount");
        return;
      }
    }

    setSubmitting(true);
    const url = expense
      ? `/api/groups/${groupId}/expenses/${expense.id}`
      : `/api/groups/${groupId}/expenses`;
    const method = expense ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Failed to save");
      setSubmitting(false);
      return;
    }
    router.push(`/dashboard/groups/${groupId}`);
    router.refresh();
  }

  async function handleDelete() {
    if (!expense || !confirm("Delete this expense?")) return;
    const res = await fetch(`/api/groups/${groupId}/expenses/${expense.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      router.push(`/dashboard/groups/${groupId}`);
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Amount ($)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="input"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input"
            required
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Paid by</label>
        <select
          value={payerId}
          onChange={(e) => setPayerId(e.target.value)}
          className="input"
        >
          {participants.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">Split mode</label>
        <div className="flex gap-4">
          {(["EQUAL", "CUSTOM_AMOUNT", "PERCENTAGE"] as const).map((mode) => (
            <label key={mode} className="flex items-center gap-2">
              <input
                type="radio"
                name="splitMode"
                checked={splitMode === mode}
                onChange={() => setSplitMode(mode)}
              />
              <span>
                {mode === "EQUAL" && "Equal"}
                {mode === "CUSTOM_AMOUNT" && "Custom amount"}
                {mode === "PERCENTAGE" && "Percentage"}
              </span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">Participants</label>
        <div className="space-y-2">
          {participants.map((p) => (
            <label key={p.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedIds.includes(p.id)}
                onChange={() => toggleParticipant(p.id)}
              />
              <span>{p.name}</span>
              {splitMode === "EQUAL" && selectedIds.includes(p.id) && (
                <span className="text-sm text-gray-500">
                  ${equalShare.toFixed(2)} each
                </span>
              )}
              {splitMode === "CUSTOM_AMOUNT" && selectedIds.includes(p.id) && (
                <input
                  type="number"
                  step="0.01"
                  className="input ml-2 w-24 py-1 text-sm"
                  placeholder="0"
                  value={customAmounts[p.id] ?? ""}
                  onChange={(e) =>
                    setCustomAmounts((prev) => ({ ...prev, [p.id]: e.target.value }))
                  }
                />
              )}
              {splitMode === "PERCENTAGE" && selectedIds.includes(p.id) && (
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  className="input ml-2 w-20 py-1 text-sm"
                  placeholder="%"
                  value={percentages[p.id] ?? ""}
                  onChange={(e) =>
                    setPercentages((prev) => ({ ...prev, [p.id]: e.target.value }))
                  }
                />
              )}
            </label>
          ))}
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Saving…" : isEdit ? "Update" : "Add expense"}
        </button>
        {isEdit && (
          <button
            type="button"
            onClick={handleDelete}
            className="btn-danger"
          >
            Delete
          </button>
        )}
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-secondary"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
