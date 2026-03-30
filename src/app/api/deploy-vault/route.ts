import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { strategy, ipfsCID } = await req.json();

    // Build the transaction body for Flow testnet
    const CONTRACT_ADDRESS = "0xf8105fdaa45bc140";
    
    // Return the transaction details for client-side signing
    // In production this would use a server-side signer
    return NextResponse.json({
      success: true,
      contractAddress: CONTRACT_ADDRESS,
      network: "flow-testnet",
      flowscanBase: "https://testnet.flowscan.io/transaction",
      vaultParams: {
        principalUSD: strategy.principal_usd.toFixed(2),
        targetReturnPct: strategy.target_return_pct.toFixed(2),
        exitThresholdPct: Math.abs(strategy.exit_threshold_pct).toFixed(2),
        horizonDays: strategy.time_horizon_days.toString(),
        maxSingleProtocolPct: strategy.max_single_protocol_pct.toFixed(2),
        rebalanceFrequencyDays: strategy.rebalance_frequency_days.toString(),
        strategyType: strategy.strategy_type,
        ipfsCID: ipfsCID,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Deploy failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
