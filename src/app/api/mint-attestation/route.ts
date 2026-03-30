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

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{
        role: "user",
        content: `You are FlowPilot's attestation AI. Write a 2-sentence performance verdict for this DeFi vault. Be precise and data-driven.

Vault: ${vault.strategy.strategy_type} strategy
Principal: $${vault.principal_usd} | Current: $${vault.current_value_usd.toFixed(2)}
Return: ${gainPct}% over ${days} days
Allocation: ${vault.strategy.allocations.map((a: any) => `${a.protocol} ${a.percentage}%`).join(", ")}

Write the verdict now:`
      }],
      temperature: 0.6,
      max_tokens: 150,
    });

    const aiVerdict = completion.choices[0]?.message?.content || "Vault performed within expected parameters.";

    // Compute conviction score
    const convictionScore = Math.min(100, Math.round(
      (parseFloat(gainPct) / vault.strategy.target_return_pct) * 50 +
      (days / vault.strategy.time_horizon_days) * 30 +
      (vault.strategy.strategy_type === "conservative" ? 20 : vault.strategy.strategy_type === "balanced" ? 15 : 10)
    ));

    const attestation = {
      type: "FlowPilotPerformanceAttestation",
      version: "1.0",
      issuedAt: new Date().toISOString(),
      issuer: "FlowPilot Protocol",
      contractAddress: "0xf8105fdaa45bc140",
      network: "flow-testnet",
      subject: {
        vaultId: vault.id,
        strategyType: vault.strategy.strategy_type,
        ipfsCID: vault.ipfs_cid,
      },
      performance: {
        principalUSD: vault.principal_usd,
        finalValueUSD: parseFloat(vault.current_value_usd.toFixed(2)),
        gainLossUSD: parseFloat(gain.toFixed(2)),
        gainLossPct: parseFloat(gainPct),
        durationDays: days,
        targetReturnPct: vault.strategy.target_return_pct,
        goalAchieved: parseFloat(gainPct) >= vault.strategy.target_return_pct,
        convictionScore,
      },
      allocations: vault.strategy.allocations,
      aiVerdict,
      protocolFee: { rate: "15%", appliesTo: "gains above principal" },
    };

    const content = JSON.stringify(attestation, null, 2);
    let attestationCID = `attestation-${Date.now()}`;
    let real = false;

    // Try NFT.storage
    try {
      const { NFTStorage, Blob: NFTBlob } = await import("nft.storage");
      const client = new NFTStorage({ token: process.env.NFT_STORAGE_TOKEN || "" });
      const blob = new NFTBlob([content], { type: "application/json" });
      const cid = await client.storeBlob(blob);
      if (cid) { attestationCID = cid; real = true; }
    } catch {}

    return NextResponse.json({
      success: true,
      attestation,
      attestationCID,
      ipfsUrl: `https://ipfs.io/ipfs/${attestationCID}`,
      aiVerdict,
      convictionScore,
      real,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Attestation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
