import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { vault, finalReport } = await req.json();

    const archivePayload = {
      vaultId: vault.id,
      userEmail: vault.user_email,
      strategy: vault.strategy,
      ipfsCID: vault.ipfs_cid,
      principalUSD: vault.principal_usd,
      finalValueUSD: vault.current_value_usd,
      gainLossUSD: vault.current_value_usd - vault.principal_usd,
      gainLossPct: ((vault.current_value_usd - vault.principal_usd) / vault.principal_usd) * 100,
      createdAt: vault.created_at,
      archivedAt: new Date().toISOString(),
      finalReport: finalReport || "Vault completed autopilot cycle.",
      contractAddress: "0xf8105fdaa45bc140",
      network: "flow-testnet",
      protocol: "flowpilot-v1",
    };

    // Upload to Lighthouse (Filecoin)
    const content = JSON.stringify(archivePayload, null, 2);
    const blob = new Blob([content], { type: "application/json" });
    const formData = new FormData();
    formData.append("file", blob, `vault-archive-${vault.id}.json`);

    let lighthouseCID = null;
    try {
      const lighthouseRes = await fetch("https://node.lighthouse.storage/api/v0/add", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.LIGHTHOUSE_API_KEY}`,
        },
        body: formData,
      });

      if (lighthouseRes.ok) {
        const lighthouseData = await lighthouseRes.json();
        lighthouseCID = lighthouseData.Hash || lighthouseData.cid;
      }
    } catch (e) {
      console.log("Lighthouse upload attempt:", e);
    }

    return NextResponse.json({
      success: true,
      archived: true,
      lighthouseCID,
      filecoinUrl: lighthouseCID ? `https://gateway.lighthouse.storage/ipfs/${lighthouseCID}` : null,
      archivePayload,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Archive failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
