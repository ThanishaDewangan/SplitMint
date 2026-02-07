import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getGroqClient, MINTENSE_MODEL } from "@/lib/groq";

const bodySchema = z.object({
  statement: z.string().min(1).max(2000),
  participantNames: z.array(z.string()).optional(),
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
    const { statement, participantNames = [] } = bodySchema.parse(body);
    const namesHint =
      participantNames.length > 0
        ? `Possible participant names (use one as payer and for splits): ${participantNames.join(", ")}.`
        : "";

    const systemPrompt = `You are MintSense, an expense parser. Convert the user's natural language into a structured expense.
Output ONLY valid JSON with no markdown or extra text, in this exact shape:
{"description":"short description","amount":number,"payerName":"who paid","splitMode":"EQUAL|CUSTOM_AMOUNT|PERCENTAGE","category":"type","participantShares":[]}
For participantShares: for EQUAL use [{"name":"A"},{"name":"B"}]. For CUSTOM_AMOUNT use [{"name":"A","amount":10},{"name":"B","amount":5}]. For PERCENTAGE use [{"name":"A","percentage":50},{"name":"B","percentage":50}].
Amount must be a number. Use the payer as one of the participants in the split. If only one person paid for something shared, include all participants and use EQUAL.
Auto-categorize the expense: set "category" to one of: food, transport, utilities, entertainment, shopping, health, travel, other.
${namesHint}`;

    const completion = await groq.chat.completions.create({
      model: MINTENSE_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: statement },
      ],
      max_tokens: 512,
      temperature: 0.2,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : raw;
    const parsed = JSON.parse(jsonStr) as {
      description?: string;
      amount?: number;
      payerName?: string;
      splitMode?: string;
      category?: string;
      participantShares?: { name?: string; amount?: number; percentage?: number }[];
    };

    return NextResponse.json({
      description: parsed.description ?? "",
      amount: typeof parsed.amount === "number" ? parsed.amount : 0,
      payerName: parsed.payerName ?? "",
      splitMode: parsed.splitMode ?? "EQUAL",
      category: typeof parsed.category === "string" ? parsed.category : "other",
      participantShares: Array.isArray(parsed.participantShares)
        ? parsed.participantShares
        : [],
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: e.errors.map((x) => x.message).join(", ") },
        { status: 400 }
      );
    }
    if (e instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Could not parse AI response as expense" },
        { status: 422 }
      );
    }
    return NextResponse.json(
      { error: "MintSense failed" },
      { status: 500 }
    );
  }
}
