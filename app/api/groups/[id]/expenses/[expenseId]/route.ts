import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { roundShares } from "@/lib/rounding";

const updateSchema = z.object({
  description: z.string().min(1).max(500).optional(),
  amount: z.number().positive().optional(),
  date: z.string().min(1).optional(),
  payerId: z.string().optional(),
  splitMode: z.enum(["EQUAL", "CUSTOM_AMOUNT", "PERCENTAGE"]).optional(),
  participantIds: z.array(z.string()).min(1).optional(),
  customAmounts: z.record(z.string(), z.number()).optional(),
  percentages: z.record(z.string(), z.number()).optional(),
});

function buildShares(
  amount: number,
  payerId: string,
  participantIds: string[],
  splitMode: string,
  customAmounts?: Record<string, number>,
  percentages?: Record<string, number>
): { participantId: string; amount: number; percentage?: number }[] {
  const payerIndex = participantIds.indexOf(payerId);
  if (payerIndex < 0) return [];

  if (splitMode === "EQUAL") {
    const n = participantIds.length;
    const raw = participantIds.map(() => amount / n);
    const rounded = roundShares(amount, raw, payerIndex);
    return participantIds.map((pid, i) => ({ participantId: pid, amount: rounded[i]! }));
  }
  if (splitMode === "CUSTOM_AMOUNT" && customAmounts) {
    const raw = participantIds.map((pid) => customAmounts[pid] ?? 0);
    const rounded = roundShares(amount, raw, payerIndex);
    return participantIds.map((pid, i) => ({ participantId: pid, amount: rounded[i]! }));
  }
  if (splitMode === "PERCENTAGE" && percentages) {
    const raw = participantIds.map((pid) => (amount * (percentages[pid] ?? 0)) / 100);
    const rounded = roundShares(amount, raw, payerIndex);
    return participantIds.map((pid, i) => ({
      participantId: pid,
      amount: rounded[i]!,
      percentage: percentages[pid] ?? 0,
    }));
  }
  throw new Error("Invalid split mode or missing data");
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id, expenseId } = await params;
  const group = await prisma.group.findFirst({
    where: { id, primaryUserId: session.user.id },
  });
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }
  const expense = await prisma.expense.findFirst({
    where: { id: expenseId, groupId: id },
    include: { payer: true, shares: { include: { participant: true } } },
  });
  if (!expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }
  return NextResponse.json(expense);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id, expenseId } = await params;
  const group = await prisma.group.findFirst({
    where: { id, primaryUserId: session.user.id },
    include: { participants: true },
  });
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }
  const existing = await prisma.expense.findFirst({
    where: { id: expenseId, groupId: id },
    include: { shares: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }
  try {
    const body = await req.json();
    const data = updateSchema.parse(body);
    const amount = data.amount ?? existing.amount;
    const payerId = data.payerId ?? existing.payerId;
    const splitMode = data.splitMode ?? existing.splitMode;
    const participantIds = data.participantIds ?? existing.shares.map((s) => s.participantId);

    const validParticipantIds = group.participants.map((p) => p.id);
    if (!participantIds.every((pid) => validParticipantIds.includes(pid))) {
      return NextResponse.json({ error: "Invalid participant" }, { status: 400 });
    }
    if (!validParticipantIds.includes(payerId)) {
      return NextResponse.json({ error: "Invalid payer" }, { status: 400 });
    }

    const shareRows = buildShares(
      amount,
      payerId,
      participantIds,
      splitMode,
      data.customAmounts,
      data.percentages
    );

    await prisma.expenseShare.deleteMany({ where: { expenseId } });
    const expense = await prisma.expense.update({
      where: { id: expenseId },
      data: {
        ...(data.description !== undefined && { description: data.description }),
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.date !== undefined && { date: new Date(data.date) }),
        payerId,
        splitMode,
        shares: {
          create: shareRows.map((s) => ({
            participantId: s.participantId,
            amount: s.amount,
            percentage: s.percentage ?? null,
          })),
        },
      },
      include: { payer: true, shares: { include: { participant: true } } },
    });
    return NextResponse.json(expense);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: e.errors.map((x) => x.message).join(", ") },
        { status: 400 }
      );
    }
    if (e instanceof Error) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to update expense" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id, expenseId } = await params;
  const group = await prisma.group.findFirst({
    where: { id, primaryUserId: session.user.id },
  });
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }
  const expense = await prisma.expense.findFirst({
    where: { id: expenseId, groupId: id },
  });
  if (!expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }
  await prisma.expense.delete({ where: { id: expenseId } });
  return NextResponse.json({ success: true });
}
