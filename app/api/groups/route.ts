import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const createSchema = z.object({
  name: z.string().min(1).max(100),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const groups = await prisma.group.findMany({
    where: { primaryUserId: session.user.id },
    include: { participants: true },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(groups);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { name } = createSchema.parse(body);
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });
    const displayName = user?.name || session.user.email || "Me";
    const group = await prisma.group.create({
      data: {
        name,
        primaryUserId: session.user.id,
        participants: {
          create: {
            name: displayName,
            userId: session.user.id,
          },
        },
      },
      include: { participants: true },
    });
    return NextResponse.json(group);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: e.errors.map((x) => x.message).join(", ") },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create group" },
      { status: 500 }
    );
  }
}
