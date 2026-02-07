"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCallback } from "react";

type Participant = { id: string; name: string };
type Share = { participantId: string; amount: number; participant: Participant };
type Expense = {
  id: string;
  description: string;
  amount: number;
  date: string;
  payer: Participant;
  shares: Share[];
};

export function ExpenseListWithFilters({
  groupId,
  participants,
  expenses,
  search,
  participantId,
  dateFrom,
  dateTo,
  amountMin,
  amountMax,
}: {
  groupId: string;
  participants: Participant[];
  expenses: Expense[];
  search: string;
  participantId: string;
  dateFrom: string;
  dateTo: string;
  amountMin: string;
  amountMax: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setParams = useCallback(
    (updates: Record<string, string>) => {
      const p = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([k, v]) => {
        if (v === "") p.delete(k);
        else p.set(k, v);
      });
      router.push(`/dashboard/groups/${groupId}/expenses?${p.toString()}`);
    },
    [groupId, router, searchParams]
  );

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap gap-4">
        <div className="flex-1 min-w-[180px]">
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Search
          </label>
          <input
            type="text"
            value={search}
            onChange={(e) => setParams({ search: e.target.value })}
            placeholder="Description..."
            className="input py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Participant
          </label>
          <select
            value={participantId}
            onChange={(e) => setParams({ participant: e.target.value })}
            className="input py-1.5 text-sm"
          >
            <option value="">All</option>
            {participants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Date from
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setParams({ dateFrom: e.target.value })}
            className="input py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Date to
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setParams({ dateTo: e.target.value })}
            className="input py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Min amount
          </label>
          <input
            type="number"
            step="0.01"
            value={amountMin}
            onChange={(e) => setParams({ amountMin: e.target.value })}
            placeholder="0"
            className="input w-24 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Max amount
          </label>
          <input
            type="number"
            step="0.01"
            value={amountMax}
            onChange={(e) => setParams({ amountMax: e.target.value })}
            placeholder="Any"
            className="input w-24 py-1.5 text-sm"
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        {expenses.length === 0 ? (
          <p className="py-8 text-center text-gray-500">No expenses match the filters.</p>
        ) : (
          <ul className="divide-y divide-mint-100">
            {expenses.map((e) => {
              const date = new Date(e.date).toLocaleDateString();
              return (
                <li
                  key={e.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0"
                >
                  <div>
                    <Link
                      href={`/dashboard/groups/${groupId}/expenses/${e.id}/edit`}
                      className="font-medium text-mint-800 hover:underline"
                    >
                      {e.description}
                    </Link>
                    <p className="text-sm text-gray-500">
                      {date} · {e.payer.name} paid
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">${e.amount.toFixed(2)}</span>
                    <Link
                      href={`/dashboard/groups/${groupId}/expenses/${e.id}/edit`}
                      className="text-sm text-mint-600 hover:underline"
                    >
                      Edit
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
