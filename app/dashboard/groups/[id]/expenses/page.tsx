import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ExpenseListWithFilters } from "./ExpenseListWithFilters";

export default async function GroupExpensesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const { id } = await params;
  const group = await prisma.group.findFirst({
    where: { id, primaryUserId: session.user.id },
    include: {
      participants: true,
      expenses: {
        include: { payer: true, shares: { include: { participant: true } } },
        orderBy: { date: "desc" },
      },
    },
  });
  if (!group) notFound();

  const sp = await searchParams;
  const search = sp.search ?? "";
  const participantId = sp.participant ?? "";
  const dateFrom = sp.dateFrom ?? "";
  const dateTo = sp.dateTo ?? "";
  const amountMin = sp.amountMin ?? "";
  const amountMax = sp.amountMax ?? "";

  let expenses = group.expenses;
  if (search) {
    const q = search.toLowerCase();
    expenses = expenses.filter((e) =>
      e.description.toLowerCase().includes(q)
    );
  }
  if (participantId) {
    expenses = expenses.filter(
      (e) =>
        e.payerId === participantId ||
        e.shares.some((s) => s.participantId === participantId)
    );
  }
  if (dateFrom) {
    const d = new Date(dateFrom);
    expenses = expenses.filter((e) => new Date(e.date) >= d);
  }
  if (dateTo) {
    const d = new Date(dateTo);
    d.setHours(23, 59, 59, 999);
    expenses = expenses.filter((e) => new Date(e.date) <= d);
  }
  if (amountMin !== "") {
    const n = Number(amountMin);
    if (!Number.isNaN(n)) expenses = expenses.filter((e) => e.amount >= n);
  }
  if (amountMax !== "") {
    const n = Number(amountMax);
    if (!Number.isNaN(n)) expenses = expenses.filter((e) => e.amount <= n);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href={`/dashboard/groups/${id}`}
            className="text-sm text-mint-600 hover:underline"
          >
            ← {group.name}
          </Link>
          <h1 className="text-2xl font-bold text-mint-800">Expenses</h1>
        </div>
        <Link href={`/dashboard/groups/${id}/expenses/new`} className="btn-primary">
          Add expense
        </Link>
      </div>

      <ExpenseListWithFilters
        groupId={id}
        participants={group.participants}
        expenses={expenses}
        search={search}
        participantId={participantId}
        dateFrom={dateFrom}
        dateTo={dateTo}
        amountMin={amountMin}
        amountMax={amountMax}
      />
    </div>
  );
}
