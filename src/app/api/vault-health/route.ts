import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { vault } = await req.json();
    const gain = vault.current_value_usd - vault.principal_usd;
    const gainPct = (gain / vault.principal_usd) * 100;
    const days = Math.max(1, Math.floor(
      (Date.now() - new Date(vault.created_at).getTime()) / (1000 * 60 * 60 * 24)
    ));
    const horizonProgress = Math.min(1, days / vault.strategy.time_horizon_days);
    const returnProgress = Math.min(1, gainPct / vault.strategy.target_return_pct);
    const maxAlloc = Math.max(...vault.strategy.allocations.map((a: any) => a.percentage));
    const concentrationRisk = maxAlloc > vault.strategy.max_single_protocol_pct ? 0.8 : 1.0;

    // Compute component scores
    const returnScore = Math.max(0, Math.min(40, returnProgress * 40));
    const paceScore = Math.max(0, Math.min(25, (returnProgress / Math.max(horizonProgress, 0.01)) * 25));
    const riskScore = Math.max(0, Math.min(20, concentrationRisk * 20));
    const stabilityScore = gainPct >= vault.strategy.exit_threshold_pct ? 15 : 0;
    const healthScore = Math.round(returnScore + paceScore + riskScore + stabilityScore);

    const level = healthScore >= 80 ? "excellent" :
                  healthScore >= 60 ? "good" :
                  healthScore >= 40 ? "fair" : "needs attention";

    const color = healthScore >= 80 ? "#00ff88" :
                  healthScore >= 60 ? "#00d4ff" :
                  healthScore >= 40 ? "#EF9F27" : "#ff4466";

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{
        role: "user",
        content: `FlowPilot vault health is ${healthScore}/100 (${level}). Return: ${gainPct.toFixed(2)}% of ${vault.strategy.target_return_pct}% target. Write one sentence explaining the health score. Be direct.`
      }],
      temperature: 0.5,
      max_tokens: 80,
    });

    const explanation = completion.choices[0]?.message?.content || `Your vault health is ${level}.`;

    return NextResponse.json({
      success: true,
      healthScore,
      level,
      color,
      explanation,
      breakdown: {
        returnScore: Math.round(returnScore),
        paceScore: Math.round(paceScore),
        riskScore: Math.round(riskScore),
        stabilityScore: Math.round(stabilityScore),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Health check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
