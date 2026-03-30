import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { vaultId, rebalanceFrequencyDays, strategyType } = await req.json();

    const nextRebalance = new Date();
    nextRebalance.setDate(nextRebalance.getDate() + rebalanceFrequencyDays);

    const schedule = {
      vaultId,
      scheduledAt: new Date().toISOString(),
      nextRebalanceAt: nextRebalance.toISOString(),
      nextRebalanceTimestamp: Math.floor(nextRebalance.getTime() / 1000),
      rebalanceFrequencyDays,
      strategyType,
      contractAddress: "0xf8105fdaa45bc140",
      network: "flow-testnet",
      schedulerContract: "0x8c5303eaa26202d6",
      status: "scheduled",
      cadenceTransaction: "ScheduleRebalance.cdc",
    };

    // Store schedule in Supabase
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    await supabase.from("vaults").update({
      next_report_at: nextRebalance.toISOString(),
      last_rebalanced_at: new Date().toISOString(),
    }).eq("id", vaultId);

    return NextResponse.json({ success: true, schedule });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Schedule failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
