import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

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
      expenses: { include: { payer: true, shares: { include: { participant: true } } } },
    },
  });
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }
  return NextResponse.json(group);
}

export async function PATCH(
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
  try {
    const body = await req.json();
    const data = updateSchema.parse(body);
    const updated = await prisma.group.update({
      where: { id },
      data,
      include: { participants: true },
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
      { error: "Failed to update group" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
  });
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }
  await prisma.group.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
