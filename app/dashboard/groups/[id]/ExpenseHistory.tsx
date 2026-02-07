"use client";

import Link from "next/link";

type Participant = { id: string; name: string; color: string | null };
type Share = { participantId: string; amount: number; participant: Participant };
type Expense = {
  id: string;
  description: string;
  amount: number;
  date: string;
  payer: Participant;
  shares: Share[];
};

/** Color-coded ledger: green = you're owed (you paid), red = you owe (your share), neutral = others */
function ledgerRowClass(
  expense: Expense,
  currentUserParticipantId: string | null
): string {
  if (!currentUserParticipantId) return "bg-white";
  const isPayer = expense.payer.id === currentUserParticipantId;
  const isInShare = expense.shares.some((s) => s.participantId === currentUserParticipantId);
  if (isPayer && !isInShare) return "bg-white";
  if (isPayer && isInShare) return "bg-green-50/70 border-l-4 border-green-400";
  if (isInShare) return "bg-red-50/70 border-l-4 border-red-400";
  return "bg-gray-50/50 border-l-4 border-gray-200";
}

export function ExpenseHistory({
  groupId,
  expenses,
  participants,
  currentUserParticipantId = null,
}: {
  groupId: string;
  expenses: Expense[];
  participants: Participant[];
  currentUserParticipantId?: string | null;
}) {
  if (expenses.length === 0) {
    return (
      <div className="card text-center text-gray-500">
        No expenses yet. Add one to get started.
      </div>
    );
  }

  return (
    <div className="card overflow-hidden p-0">
      <ul className="divide-y divide-mint-100">
        {expenses.map((e) => {
          const date = new Date(e.date).toLocaleDateString();
          const rowClass = ledgerRowClass(e, currentUserParticipantId);
          return (
            <li
              key={e.id}
              className={`flex flex-wrap items-center justify-between gap-2 px-4 py-3 first:pt-3 ${rowClass}`}
            >
              <div>
                <Link
                  href={`/dashboard/groups/${groupId}/expenses/${e.id}/edit`}
                  className="font-medium text-mint-800 hover:underline"
                >
                  {e.description}
                </Link>
                <p className="text-sm text-gray-500">
                  {date} · {e.payer.name} paid ${e.amount.toFixed(2)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-800">
                  ${e.amount.toFixed(2)}
                </span>
                <span className="rounded bg-mint-100 px-2 py-0.5 text-xs text-mint-800">
                  {e.shares.length} share{e.shares.length !== 1 ? "s" : ""}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
