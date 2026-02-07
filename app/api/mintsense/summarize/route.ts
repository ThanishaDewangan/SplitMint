import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getGroqClient, MINTENSE_MODEL } from "@/lib/groq";

const bodySchema = z.object({
  groupName: z.string().optional(),
  expenses: z.array(
    z.object({
      description: z.string(),
      amount: z.number(),
      date: z.string(),
      payerName: z.string(),
      shares: z.array(z.object({ name: z.string(), amount: z.number() })).optional(),
    })
  ),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const groq = getGroqClient();
  if (!groq) {
    return NextResponse.json(
      { error: "MintSense is not configured. Add GROQ_API_KEY to enable." },
      { status: 503 }
    );
  }
  try {
    const body = await req.json();
    const { groupName, expenses } = bodySchema.parse(body);
    const summary = expenses
      .map(
        (e) =>
          `- ${e.description}: $${e.amount.toFixed(2)} on ${e.date} (${e.payerName} paid)`
      )
      .join("\n");

    const completion = await groq.chat.completions.create({
      model: MINTENSE_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are MintSense. Generate a short, readable group expense summary (2-4 sentences). Mention total spent, who paid the most if relevant, and any balance hint. Be concise.",
        },
        {
          role: "user",
          content: `Group: ${groupName ?? "Expense group"}\nExpenses:\n${summary}`,
        },
      ],
      max_tokens: 256,
      temperature: 0.3,
    });

    const text = completion.choices[0]?.message?.content?.trim() ?? "";
    return NextResponse.json({ summary: text });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: e.errors.map((x) => x.message).join(", ") },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "MintSense failed" },
      { status: 500 }
    );
  }
}
