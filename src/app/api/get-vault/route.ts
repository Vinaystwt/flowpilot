import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    // Query Flow testnet for total vault count
    const script = `
      import FlowPilotVault from 0xf8105fdaa45bc140
      access(all) fun main(): UInt64 {
        return FlowPilotVault.getTotalVaults()
      }
    `;

    const response = await fetch("https://rest-testnet.onflow.org/v1/scripts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        script: Buffer.from(script).toString("base64"),
        arguments: [],
      }),
    });

    if (response.ok) {
      const data = await response.json();
      // Flow returns Cadence JSON value
      const value = data.value || "0";
      const totalVaults = parseInt(value.replace(/[^0-9]/g, "")) || 0;
      return NextResponse.json({ totalVaults, network: "flow-testnet" });
    }

    return NextResponse.json({ totalVaults: 0 });
  } catch {
    return NextResponse.json({ totalVaults: 0 });
  }
}
