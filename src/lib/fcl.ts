import * as fcl from "@onflow/fcl";

fcl.config({
  "flow.network": "testnet",
  "accessNode.api": "https://rest-testnet.onflow.org",
  "discovery.wallet": "https://fcl-discovery.onflow.org/testnet/authn",
  "app.detail.title": "FlowPilot",
  "app.detail.icon": "https://flowpilot-puce.vercel.app/icon.png",
  "fcl.accountProof.resolver": async () => ({
    appIdentifier: "FlowPilot",
    nonce: Math.random().toString(36).substring(2),
  }),
});

export { fcl };

export const CONTRACT_ADDRESS = "0xf8105fdaa45bc140";

export async function createVaultOnChain(params: {
  principalUSD: number;
  targetReturnPct: number;
  exitThresholdPct: number;
  horizonDays: number;
  maxSingleProtocolPct: number;
  rebalanceFrequencyDays: number;
  strategyType: string;
  ipfsCID: string;
}): Promise<string> {
  const txId = await fcl.mutate({
    cadence: `
      import FlowPilotVault from ${CONTRACT_ADDRESS}

      transaction(
        principalUSD: UFix64,
        targetReturnPct: UFix64,
        exitThresholdPct: UFix64,
        horizonDays: UInt64,
        maxSingleProtocolPct: UFix64,
        rebalanceFrequencyDays: UInt64,
        strategyType: String,
        ipfsCID: String
      ) {
        prepare(signer: &Account) {}
        execute {
          let vaultID = FlowPilotVault.createVault(
            owner: ${CONTRACT_ADDRESS},
            principalUSD: principalUSD,
            targetReturnPct: targetReturnPct,
            exitThresholdPct: exitThresholdPct,
            horizonDays: horizonDays,
            maxSingleProtocolPct: maxSingleProtocolPct,
            rebalanceFrequencyDays: rebalanceFrequencyDays,
            strategyType: strategyType,
            ipfsCID: ipfsCID
          )
          log(vaultID)
        }
      }
    `,
    args: (arg: any, t: any) => [
      arg(params.principalUSD.toFixed(2), t.UFix64),
      arg(params.targetReturnPct.toFixed(2), t.UFix64),
      arg(Math.abs(params.exitThresholdPct).toFixed(2), t.UFix64),
      arg(params.horizonDays.toString(), t.UInt64),
      arg(params.maxSingleProtocolPct.toFixed(2), t.UFix64),
      arg(params.rebalanceFrequencyDays.toString(), t.UInt64),
      arg(params.strategyType, t.String),
      arg(params.ipfsCID, t.String),
    ],
    proposer: fcl.currentUser,
    payer: fcl.currentUser,
    authorizations: [fcl.currentUser],
    limit: 1000,
  });
  return txId;
}

export async function getVaultCount(): Promise<number> {
  try {
    const result = await fcl.query({
      cadence: `
        import FlowPilotVault from ${CONTRACT_ADDRESS}
        access(all) fun main(): UInt64 {
          return FlowPilotVault.getTotalVaults()
        }
      `,
    });
    return parseInt(result);
  } catch {
    return 0;
  }
}
