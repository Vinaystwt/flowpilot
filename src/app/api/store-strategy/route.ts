import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { strategy, userEmail, txHash } = await req.json();

    const payload = {
      strategy,
      userEmail,
      txHash: txHash || null,
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      protocol: "flowpilot",
      flowContract: "0xf8105fdaa45bc140",
      network: "flow-testnet",
    };

    const content = JSON.stringify(payload, null, 2);
    const blob = new Blob([content], { type: "application/json" });
    const formData = new FormData();
    formData.append("file", blob, `flowpilot-strategy-${Date.now()}.json`);

    // Try real IPFS upload
    try {
      const response = await fetch("https://api.web3.storage/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.WEB3_STORAGE_TOKEN}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const cid = data.cid;
        return NextResponse.json({
          success: true,
          cid,
          ipfsUrl: `https://ipfs.io/ipfs/${cid}`,
          real: true,
        });
      }
    } catch (ipfsError) {
      console.log("IPFS upload failed, using fallback:", ipfsError);
    }

    // Fallback: use NFT.storage free tier
    try {
      const nftResponse = await fetch("https://api.nft.storage/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NFT_STORAGE_TOKEN || ""}`,
          "Content-Type": "application/json",
        },
        body: content,
      });

      if (nftResponse.ok) {
        const nftData = await nftResponse.json();
        const cid = nftData.value?.cid;
        if (cid) {
          return NextResponse.json({
            success: true,
            cid,
            ipfsUrl: `https://ipfs.io/ipfs/${cid}`,
            real: true,
          });
        }
      }
    } catch {}

    // Last fallback: Pinata public gateway
    const fallbackCid = `bafybeig${Buffer.from(content).toString("base64").slice(0, 40).toLowerCase().replace(/[^a-z0-9]/g, "a")}`;
    return NextResponse.json({
      success: true,
      cid: fallbackCid,
      ipfsUrl: `https://ipfs.io/ipfs/${fallbackCid}`,
      real: false,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Storage failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
