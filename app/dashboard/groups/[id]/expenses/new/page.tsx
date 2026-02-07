import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ExpenseForm } from "../ExpenseForm";

export default async function NewExpensePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const { id } = await params;
  const sp = await searchParams;
  const group = await prisma.group.findFirst({
    where: { id, primaryUserId: session.user.id },
    include: { participants: true },
  });
  if (!group) notFound();

  const mintsense =
    sp.mintsense === "1"
      ? {
          description: sp.description ?? "",
          amount: sp.amount ? parseFloat(sp.amount) : undefined,
          payerName: sp.payerName ?? "",
          splitMode: (sp.splitMode as "EQUAL" | "CUSTOM_AMOUNT" | "PERCENTAGE") ?? "EQUAL",
        }
      : undefined;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link
        href={`/dashboard/groups/${id}/expenses`}
        className="text-sm text-mint-600 hover:underline"
      >
        ← Back to expenses
      </Link>
      <h1 className="text-2xl font-bold text-mint-800">Add expense</h1>
      <ExpenseForm
        groupId={id}
        participants={group.participants}
        mintsensePrefill={mintsense}
      />
    </div>
  );
}
