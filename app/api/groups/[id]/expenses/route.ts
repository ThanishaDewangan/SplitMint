import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { roundShares } from "@/lib/rounding";

const createSchema = z.object({
  description: z.string().min(1).max(500),
  amount: z.number().positive(),
  date: z.string().min(1),
  payerId: z.string(),
  splitMode: z.enum(["EQUAL", "CUSTOM_AMOUNT", "PERCENTAGE"]),
  participantIds: z.array(z.string()).min(1),
  customAmounts: z.record(z.string(), z.number()).optional(), // participantId -> amount
  percentages: z.record(z.string(), z.number()).optional(),   // participantId -> 0-100
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const group = await prisma.group.findFirst({
    where: { id, primaryUserId: session.user.id },
  });
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const participantId = searchParams.get("participant");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const amountMin = searchParams.get("amountMin");
  const amountMax = searchParams.get("amountMax");

  const where: Record<string, unknown> = { groupId: id };
  if (search) {
    where.description = { contains: search };
  }
  if (participantId) {
    where.OR = [
      { payerId: participantId },
      { shares: { some: { participantId } } },
    ];
  }
  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) (where.date as Record<string, string>).gte = new Date(dateFrom).toISOString();
    if (dateTo) (where.date as Record<string, string>).lte = new Date(dateTo).toISOString();
  }
  if (amountMin != null && amountMin !== "") {
    where.amount = where.amount ?? {};
    (where.amount as Record<string, number>).gte = Number(amountMin);
  }
  if (amountMax != null && amountMax !== "") {
    where.amount = where.amount ?? {};
    (where.amount as Record<string, number>).lte = Number(amountMax);
  }

  const expenses = await prisma.expense.findMany({
    where,
    include: { payer: true, shares: { include: { participant: true } } },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(expenses);
}

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
    const sum = raw.reduce((a, b) => a + b, 0);
    if (Math.abs(sum - amount) > 0.01) {
      throw new Error("Custom amounts must sum to expense amount");
    }
    const rounded = roundShares(amount, raw, payerIndex);
    return participantIds.map((pid, i) => ({ participantId: pid, amount: rounded[i]! }));
  }

  if (splitMode === "PERCENTAGE" && percentages) {
    const sumPct = participantIds.reduce((s, pid) => s + (percentages[pid] ?? 0), 0);
    if (Math.abs(sumPct - 100) > 0.01) {
      throw new Error("Percentages must sum to 100");
    }
    const raw = participantIds.map((pid) => (amount * (percentages[pid] ?? 0)) / 100);
    const rounded = roundShares(amount, raw, payerIndex);
    return participantIds.map((pid, i) => ({
      participantId: pid,
      amount: rounded[i]!,
      percentage: percentages[pid] ?? 0,
    }));
  }

  throw new Error("Invalid split mode or missing custom/percentage data");
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const group = await prisma.group.findFirst({
    where: { id, primaryUserId: session.user.id },
    include: { participants: true },
  });
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }
  try {
    const body = await req.json();
    const parsed = createSchema.parse(body);
    const { description, amount, payerId, splitMode, participantIds, customAmounts, percentages } = parsed;
    const date = new Date(parsed.date);

    const validParticipantIds = group.participants.map((p) => p.id);
    if (!participantIds.every((pid) => validParticipantIds.includes(pid))) {
      return NextResponse.json({ error: "Invalid participant in list" }, { status: 400 });
    }
    if (!validParticipantIds.includes(payerId)) {
      return NextResponse.json({ error: "Payer must be a group participant" }, { status: 400 });
    }

    const shareRows = buildShares(
      amount,
      payerId,
      participantIds,
      splitMode,
      customAmounts,
      percentages
    );

    const expense = await prisma.expense.create({
      data: {
        groupId: id,
        description,
        amount,
        date,
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
      { error: "Failed to create expense" },
      { status: 500 }
    );
  }
}
