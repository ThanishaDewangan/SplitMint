import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getGroqClient, MINTENSE_MODEL } from "@/lib/groq";

const bodySchema = z.object({
  settlements: z.array(
    z.object({
      fromName: z.string(),
      toName: z.string(),
      amount: z.number(),
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
    const { settlements } = bodySchema.parse(body);
    if (settlements.length === 0) {
      return NextResponse.json({
        suggestion:
          "No settlements needed. Everyone is squared up.",
      });
    }

    const list = settlements
      .map((s) => `${s.fromName} pays ${s.toName} $${s.amount.toFixed(2)}`)
      .join("\n");

    const completion = await groq.chat.completions.create({
      model: MINTENSE_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are MintSense. Given a list of who should pay whom, suggest the best order to settle (e.g. 'Pay X first, then Y') in 1-3 short sentences.",
        },
        {
          role: "user",
          content: `Settlement steps:\n${list}`,
        },
      ],
      max_tokens: 200,
      temperature: 0.3,
    });

    const text = completion.choices[0]?.message?.content?.trim() ?? "";
    return NextResponse.json({ suggestion: text });
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
