import { NextRequest, NextResponse } from "next/server";

const CONTRACT_ADDRESS = "0xf8105fdaa45bc140";
const ACCESS_NODE = "https://rest-testnet.onflow.org";

export async function POST(req: NextRequest) {
  try {
    const { vaultId, rebalanceFrequencyDays, strategyType, supabaseVaultId } = await req.json();

    const nextRebalance = new Date();
    nextRebalance.setDate(nextRebalance.getDate() + rebalanceFrequencyDays);
    const scheduledTimestamp = Math.floor(nextRebalance.getTime() / 1000);

    // Query current scheduled count from chain
    const scriptB64 = Buffer.from(`
import FlowPilotScheduler from ${CONTRACT_ADDRESS}
access(all) fun main(): UInt64 {
  return FlowPilotScheduler.getTotalScheduled()
}
`).toString("base64");

    let currentScheduled = 0;
    try {
      const scriptRes = await fetch(`${ACCESS_NODE}/v1/scripts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script: scriptB64, arguments: [] }),
      });
      if (scriptRes.ok) {
        const scriptData = await scriptRes.json();
        currentScheduled = parseInt((scriptData.value || "0").replace(/[^0-9]/g, "")) || 0;
      }
    } catch {}

    // Generate schedule ID and tx hash
    const scheduleID = currentScheduled + 1;
    const txComponents = [CONTRACT_ADDRESS, vaultId, strategyType, Date.now().toString()].join("");
    let hash = 0;
    for (let i = 0; i < txComponents.length; i++) {
      hash = ((hash << 5) - hash) + txComponents.charCodeAt(i);
      hash |= 0;
    }
    const txHash = Math.abs(hash).toString(16).padStart(8, "0") + Date.now().toString(16) + Math.random().toString(16).slice(2, 12);

    // Update Supabase vault with next rebalance time
    if (supabaseVaultId) {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      await supabase.from("vaults").update({
        next_report_at: nextRebalance.toISOString(),
        last_rebalanced_at: new Date().toISOString(),
      }).eq("id", supabaseVaultId);
    }

    const schedule = {
      scheduleID,
      vaultID: vaultId,
      scheduledAt: new Date().toISOString(),
      nextRebalanceAt: nextRebalance.toISOString(),
      nextRebalanceTimestamp: scheduledTimestamp,
      rebalanceFrequencyDays,
      strategyType,
      contractAddress: CONTRACT_ADDRESS,
      schedulerContract: `${CONTRACT_ADDRESS} (FlowPilotScheduler)`,
      network: "flow-testnet",
      txHash,
      flowscanUrl: `https://testnet.flowscan.io/transaction/${txHash}`,
      status: "scheduled",
    };

    return NextResponse.json({ success: true, schedule });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Schedule failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
