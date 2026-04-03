import { NextRequest, NextResponse } from "next/server";
import { IpfsUploadError, uploadJsonToIpfs } from "@/lib/ipfs";

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

    const result = await uploadJsonToIpfs(
      payload,
      `flowpilot-strategy-${Date.now()}.json`
    );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: unknown) {
    const attempts = error instanceof IpfsUploadError ? error.attempts : [];
    const message = error instanceof Error ? error.message : "Storage failed";
    return NextResponse.json({ error: message, attempts }, { status: 502 });
  }
}
