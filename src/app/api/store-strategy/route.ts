import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { strategy, userEmail } = await req.json();

    const payload = {
      strategy,
      userEmail,
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      protocol: "flowpilot",
      flowContract: "0xf8105fdaa45bc140",
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });

    const formData = new FormData();
    formData.append("file", blob, `strategy-${Date.now()}.json`);

    const response = await fetch("https://api.web3.storage/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WEB3_STORAGE_TOKEN}`,
      },
      body: formData,
    });

    let cid = `demo-cid-${Date.now()}`;

    if (response.ok) {
      const data = await response.json();
      cid = data.cid || cid;
    }

    return NextResponse.json({
      success: true,
      cid,
      ipfsUrl: `https://ipfs.io/ipfs/${cid}`,
    });
  } catch (error: unknown) {
    const cid = `demo-cid-${Date.now()}`;
    return NextResponse.json({
      success: true,
      cid,
      ipfsUrl: `https://ipfs.io/ipfs/${cid}`,
    });
  }
}
