import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { currentStrategy, mutationIntent, vaultId } = await req.json();

    const MUTATION_PROMPT = `You are a DeFi strategy optimizer for FlowPilot.
The user wants to modify their existing strategy. Output ONLY valid JSON with the updated strategy.
No preamble. No explanation. No markdown.

Current strategy:
${JSON.stringify(currentStrategy, null, 2)}

User's modification request: "${mutationIntent}"

Rules:
- Keep fields the same unless the user explicitly changes them
- All allocation percentages must sum to exactly 100
- Available protocols: IncrementFi (lending), Metapier (lp), FlowStaking (staking)
- Output the complete updated strategy JSON using the exact same schema

Output the full updated strategy JSON:`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: MUTATION_PROMPT }],
      temperature: 0.1,
      max_tokens: 1000,
    });

    const rawOutput = completion.choices[0]?.message?.content || "";
    const cleaned = rawOutput.replace(/```json/g, "").replace(/```/g, "").trim();
    const newStrategy = JSON.parse(cleaned);

    // Compute diff
    const changes: string[] = [];
    if (newStrategy.strategy_type !== currentStrategy.strategy_type) {
      changes.push(`Strategy changed from ${currentStrategy.strategy_type} to ${newStrategy.strategy_type}`);
    }
    if (newStrategy.target_return_pct !== currentStrategy.target_return_pct) {
      changes.push(`Target return updated to ${newStrategy.target_return_pct}%`);
    }
    if (newStrategy.rebalance_frequency_days !== currentStrategy.rebalance_frequency_days) {
      changes.push(`Rebalance frequency updated to every ${newStrategy.rebalance_frequency_days} days`);
    }
    newStrategy.allocations.forEach((a: any) => {
      const old = currentStrategy.allocations.find((o: any) => o.protocol === a.protocol);
      if (old && old.percentage !== a.percentage) {
        changes.push(`${a.protocol} allocation: ${old.percentage}% → ${a.percentage}%`);
      }
    });

    if (changes.length === 0) {
      changes.push("Strategy refined with current parameters maintained");
    }

    return NextResponse.json({ success: true, newStrategy, changes });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Mutation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
