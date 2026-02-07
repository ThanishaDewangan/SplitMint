import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ExpenseForm } from "../../ExpenseForm";

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string; expenseId: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const { id, expenseId } = await params;
  const group = await prisma.group.findFirst({
    where: { id, primaryUserId: session.user.id },
    include: { participants: true },
  });
  if (!group) notFound();
  const expense = await prisma.expense.findFirst({
    where: { id: expenseId, groupId: id },
    include: { payer: true, shares: { include: { participant: true } } },
  });
  if (!expense) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link
        href={`/dashboard/groups/${id}/expenses`}
        className="text-sm text-mint-600 hover:underline"
      >
        ← Back to expenses
      </Link>
      <h1 className="text-2xl font-bold text-mint-800">Edit expense</h1>
      <ExpenseForm
        groupId={id}
        participants={group.participants}
        expense={expense}
      />
    </div>
  );
}
