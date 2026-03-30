import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { vault } = await req.json();

    const gain = vault.current_value_usd - vault.principal_usd;
    const gainPct = ((gain / vault.principal_usd) * 100).toFixed(2);
    const days = Math.max(1, Math.floor(
      (Date.now() - new Date(vault.created_at).getTime()) / (1000 * 60 * 60 * 24)
    ));

    const prompt = `You are FlowPilot's AI analyst. Write a brief, plain-English performance summary for this DeFi vault. Be conversational, honest, and insightful. Maximum 3 sentences.

Vault data:
- Strategy: ${vault.strategy.strategy_type}
- Principal: $${vault.principal_usd}
- Current value: $${vault.current_value_usd.toFixed(2)}
- Return: ${gainPct}% (${gain >= 0 ? "+" : ""}$${gain.toFixed(2)})
- Duration: ${days} days
- Allocation: ${vault.strategy.allocations.map((a: any) => `${a.protocol} ${a.percentage}%`).join(", ")}
- Target return: ${vault.strategy.target_return_pct}%

Write the performance summary:`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 200,
    });

    const report = completion.choices[0]?.message?.content || "Your vault is performing as expected.";

    return NextResponse.json({ success: true, report });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Report generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
