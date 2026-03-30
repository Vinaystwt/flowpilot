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

    // Generate AI performance analysis
    const analysisPrompt = `You are FlowPilot's onchain attestation system. Write a 2-sentence performance verdict for this DeFi vault. Be precise and data-driven.

Vault: ${vault.strategy.strategy_type} strategy
Principal: $${vault.principal_usd} | Current: $${vault.current_value_usd.toFixed(2)}
Return: ${gainPct}% over ${days} days
Allocation: ${vault.strategy.allocations.map((a: any) => `${a.protocol} ${a.percentage}%`).join(", ")}

Write the verdict:`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: analysisPrompt }],
      temperature: 0.6,
      max_tokens: 150,
    });

    const aiVerdict = completion.choices[0]?.message?.content || "Vault performed within expected parameters.";

    // Build attestation object
    const attestation = {
      type: "FlowPilotPerformanceAttestation",
      version: "1.0",
      issuedAt: new Date().toISOString(),
      issuer: "FlowPilot Protocol",
      contractAddress: "0xf8105fdaa45bc140",
      network: "flow-testnet",
      subject: {
        vaultId: vault.id,
        userEmail: vault.user_email,
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
      },
      allocations: vault.strategy.allocations,
      aiVerdict,
      protocolFee: {
        rate: "15%",
        appliesTo: "gains above principal",
      },
    };

    // Upload attestation to IPFS
    const content = JSON.stringify(attestation, null, 2);
    const blob = new Blob([content], { type: "application/json" });
    const formData = new FormData();
    formData.append("file", blob, `attestation-${vault.id}-${Date.now()}.json`);

    let attestationCID = `attestation-${Date.now()}`;
    try {
      const ipfsRes = await fetch("https://api.web3.storage/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.WEB3_STORAGE_TOKEN}` },
        body: formData,
      });
      if (ipfsRes.ok) {
        const ipfsData = await ipfsRes.json();
        attestationCID = ipfsData.cid || attestationCID;
      }
    } catch {}

    return NextResponse.json({
      success: true,
      attestation,
      attestationCID,
      ipfsUrl: `https://ipfs.io/ipfs/${attestationCID}`,
      aiVerdict,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Attestation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
