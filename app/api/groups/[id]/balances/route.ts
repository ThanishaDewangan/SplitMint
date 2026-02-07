import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  computeNetBalances,
  computeDirectionalOwed,
  suggestSettlements,
} from "@/lib/balance-engine";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const group = await prisma.group.findFirst({
    where: { id, primaryUserId: session.user.id },
    include: {
      participants: true,
      expenses: { include: { shares: true } },
    },
  });
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const participantList = group.participants.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
  }));
  const expenseData = group.expenses.map((e) => ({
    payerId: e.payerId,
    amount: e.amount,
    shares: e.shares.map((s) => ({ participantId: s.participantId, amount: s.amount })),
  }));

  const balances = computeNetBalances(participantList, expenseData);
  const directional = computeDirectionalOwed(participantList, balances);
  const settlements = suggestSettlements(participantList, balances);

  return NextResponse.json({
    balances,
    directional,
    settlements,
    primaryUserId: session.user.id,
  });
}
