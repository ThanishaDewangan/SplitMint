"use client";

import { useState } from "react";
import Link from "next/link";

type Settlement = { fromName: string; toName: string; amount: number };
type ExpenseSummary = {
  description: string;
  amount: number;
  date: string;
  payerName: string;
  shares?: { name: string; amount: number }[];
};

export function MintSensePanel({
  groupId,
  groupName,
  participantNames,
  settlements,
  expenses,
}: {
  groupId: string;
  groupName: string;
  participantNames: string[];
  settlements: Settlement[];
  expenses: ExpenseSummary[];
}) {
  const [statement, setStatement] = useState("");
  const [parsed, setParsed] = useState<{
    description: string;
    amount: number;
    payerName: string;
    splitMode: string;
    category?: string;
    participantShares: { name?: string; amount?: number; percentage?: number }[];
  } | null>(null);
  const [summary, setSummary] = useState("");
  const [settlementSuggestion, setSettlementSuggestion] = useState("");
  const [loading, setLoading] = useState<"parse" | "summarize" | "settle" | null>(null);
  const [error, setError] = useState("");

  async function handleParse() {
    if (!statement.trim()) return;
    setError("");
    setLoading("parse");
    setParsed(null);
    try {
      const res = await fetch("/api/mintsense/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statement: statement.trim(),
          participantNames,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Parse failed");
      setParsed(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Parse failed");
    } finally {
      setLoading(null);
    }
  }

  async function handleSummarize() {
    setError("");
    setLoading("summarize");
    setSummary("");
    try {
      const res = await fetch("/api/mintsense/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupName,
          expenses: expenses.map((e) => ({
            description: e.description,
            amount: e.amount,
            date: typeof e.date === "string" ? e.date : new Date(e.date).toISOString(),
            payerName: e.payerName,
            shares: e.shares,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Summarize failed");
      setSummary(data.summary ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Summarize failed");
    } finally {
      setLoading(null);
    }
  }

  async function handleSettlementOrder() {
    setError("");
    setLoading("settle");
    setSettlementSuggestion("");
    try {
      const res = await fetch("/api/mintsense/suggest-settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settlements }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setSettlementSuggestion(data.suggestion ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="card border-mint-300 bg-mint-50/50">
      <h2 className="mb-3 text-lg font-semibold text-mint-800">
        MintSense (AI)
      </h2>
      {error && (
        <p className="mb-2 text-sm text-red-600">{error}</p>
      )}

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Convert text to expense
          </label>
          <textarea
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
            placeholder="e.g. Alice paid $60 for dinner, split equally with Bob and me"
            className="input min-h-[80px] text-sm"
            rows={3}
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={handleParse}
              disabled={loading !== null}
              className="btn-primary text-sm"
            >
              {loading === "parse" ? "Parsing…" : "Parse"}
            </button>
          </div>
          {parsed && (
            <div className="mt-2 rounded-lg border border-mint-200 bg-white p-3 text-sm">
              <p><strong>Description:</strong> {parsed.description}</p>
              <p><strong>Amount:</strong> ${parsed.amount.toFixed(2)}</p>
              <p><strong>Paid by:</strong> {parsed.payerName}</p>
              <p><strong>Split:</strong> {parsed.splitMode}</p>
              {parsed.category && (
                <p><strong>Category:</strong> <span className="capitalize">{parsed.category}</span></p>
              )}
              <Link
                href={{
                  pathname: `/dashboard/groups/${groupId}/expenses/new`,
                  query: {
                    mintsense: "1",
                    description: parsed.description,
                    amount: parsed.amount,
                    payerName: parsed.payerName,
                    splitMode: parsed.splitMode,
                  },
                }}
                className="mt-2 inline-block text-mint-600 hover:underline"
              >
                Use this → Add expense
              </Link>
            </div>
          )}
        </div>

        <div>
          <button
            type="button"
            onClick={handleSummarize}
            disabled={loading !== null || expenses.length === 0}
            className="btn-secondary text-sm"
          >
            {loading === "summarize" ? "Generating…" : "Generate group summary"}
          </button>
          {summary && (
            <p className="mt-2 text-sm text-gray-700">{summary}</p>
          )}
        </div>

        <div>
          <button
            type="button"
            onClick={handleSettlementOrder}
            disabled={loading !== null || settlements.length === 0}
            className="btn-secondary text-sm"
          >
            {loading === "settle" ? "Thinking…" : "Suggest settlement order"}
          </button>
          {settlementSuggestion && (
            <p className="mt-2 text-sm text-gray-700">{settlementSuggestion}</p>
          )}
        </div>
      </div>
    </div>
  );
}
