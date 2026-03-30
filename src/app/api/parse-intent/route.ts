import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are a DeFi strategy parser for FlowPilot.
Convert the user's financial goal into a structured JSON strategy object.
Output ONLY valid JSON. No preamble. No explanation. No markdown backticks.

Output schema (all fields required):
{
  "principal_usd": number,
  "target_return_pct": number,
  "time_horizon_days": number,
  "exit_threshold_pct": number,
  "max_single_protocol_pct": number,
  "strategy_type": "conservative" | "balanced" | "growth",
  "rebalance_frequency_days": number,
  "allocations": [
    { "protocol": "IncrementFi", "percentage": number, "type": "lending" },
    { "protocol": "Metapier", "percentage": number, "type": "lp" }
  ]
}

Rules:
- All allocation percentages must sum to exactly 100
- Conservative: mostly lending (70%+), low risk
- Balanced: mix of lending and LP (50/50)
- Growth: more LP and staking, higher risk/reward
- Available protocols: IncrementFi (lending), Metapier (lp), FlowStaking (staking)
- If user mentions safe or no risk use conservative
- If user mentions maximum or aggressive use growth
- Default is balanced
- exit_threshold_pct should be negative (e.g. -5 means exit if down 5%)`;

export async function POST(req: NextRequest) {
  try {
    const { userIntent } = await req.json();

    if (!userIntent || typeof userIntent !== "string") {
      return NextResponse.json({ error: "userIntent is required" }, { status: 400 });
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userIntent },
      ],
      temperature: 0.1,
      max_tokens: 1000,
    });

    const rawOutput = completion.choices[0]?.message?.content || "";
    const cleaned = rawOutput.replace(/```json/g, "").replace(/```/g, "").trim();
    const strategy = JSON.parse(cleaned);

    const total = strategy.allocations.reduce(
      (sum: number, a: { percentage: number }) => sum + a.percentage, 0
    );
    if (Math.abs(total - 100) > 2) {
      throw new Error("Allocations do not sum to 100");
    }

    return NextResponse.json({ success: true, strategy });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Parse failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
