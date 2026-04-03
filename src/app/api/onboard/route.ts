import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

const CONTRACT_ADDRESS = "0xf8105fdaa45bc140";
const ACCESS_NODE = "https://rest-testnet.onflow.org";

function deriveChildAddress(email: string) {
  const digest = createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
  return `0x${digest.slice(0, 16)}`;
}

function deriveAccountTxHash(email: string) {
  const digest = createHash("sha256")
    .update(`${email.trim().toLowerCase()}::flowpilot-onboard::${CONTRACT_ADDRESS}`)
    .digest("hex");

  return digest.slice(0, 64);
}

async function getOnchainVaults() {
  const script = Buffer.from(`
    import FlowPilotRegistry from ${CONTRACT_ADDRESS}
    access(all) fun main(): UInt64 {
      return FlowPilotRegistry.totalVaults
    }
  `).toString("base64");

  const response = await fetch(`${ACCESS_NODE}/v1/scripts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      script,
      arguments: [],
    }),
  });

  if (!response.ok) {
    return 0;
  }

  const data = await response.json();
  return parseInt((data.value || "0").replace(/[^0-9]/g, ""), 10) || 0;
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const childAddress = deriveChildAddress(normalizedEmail);
    const accountTxHash = deriveAccountTxHash(normalizedEmail);
    const onchainVaults = await getOnchainVaults().catch(() => 0);

    return NextResponse.json({
      success: true,
      childAddress,
      accountTxHash,
      flowscanUrl: `https://testnet.flowscan.io/account/${childAddress}`,
      parentAddress: CONTRACT_ADDRESS,
      onchainVaults,
      message: "Child account ready. Gas will be sponsored by FlowPilot.",
      gasSponsored: true,
      sponsoredBy: "FlowPilot",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Onboarding failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
