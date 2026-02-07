import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const MAX_PARTICIPANTS = 4; // primary + 3 others

const createSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().optional(),
  avatarUrl: z.string().url().optional().nullable(),
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
    include: { participants: true },
  });
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }
  return NextResponse.json(group.participants);
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
  if (group.participants.length >= MAX_PARTICIPANTS) {
    return NextResponse.json(
      { error: `Maximum ${MAX_PARTICIPANTS} participants allowed (including you)` },
      { status: 400 }
    );
  }
  try {
    const body = await req.json();
    const { name, color, avatarUrl } = createSchema.parse(body);
    const participant = await prisma.participant.create({
      data: { groupId: id, name, color: color ?? null, avatarUrl: avatarUrl ?? null },
    });
    return NextResponse.json(participant);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: e.errors.map((x) => x.message).join(", ") },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to add participant" },
      { status: 500 }
    );
  }
}
