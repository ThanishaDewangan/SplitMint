import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; participantId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id, participantId } = await params;
  const group = await prisma.group.findFirst({
    where: { id, primaryUserId: session.user.id },
  });
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }
  const participant = await prisma.participant.findFirst({
    where: { id: participantId, groupId: id },
  });
  if (!participant) {
    return NextResponse.json({ error: "Participant not found" }, { status: 404 });
  }
  try {
    const body = await req.json();
    const data = updateSchema.parse(body);
    const updated = await prisma.participant.update({
      where: { id: participantId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
      },
    });
    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: e.errors.map((x) => x.message).join(", ") },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update participant" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; participantId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id, participantId } = await params;
  const group = await prisma.group.findFirst({
    where: { id, primaryUserId: session.user.id },
  });
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }
  const participant = await prisma.participant.findFirst({
    where: { id: participantId, groupId: id },
    include: { expenseShares: true, paidExpenses: true },
  });
  if (!participant) {
    return NextResponse.json({ error: "Participant not found" }, { status: 404 });
  }
  if (participant.userId) {
    return NextResponse.json(
      { error: "Cannot remove the primary user from the group" },
      { status: 400 }
    );
  }
  if (participant.paidExpenses.length > 0 || participant.expenseShares.length > 0) {
    return NextResponse.json(
      { error: "Remove or reassign expenses involving this participant first" },
      { status: 400 }
    );
  }
  await prisma.participant.delete({ where: { id: participantId } });
  return NextResponse.json({ success: true });
}
