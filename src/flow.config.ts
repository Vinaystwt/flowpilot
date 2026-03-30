import { config } from "@onflow/fcl";

config({
  "flow.network": process.env.NEXT_PUBLIC_FLOW_NETWORK || "testnet",
  "accessNode.api": process.env.NEXT_PUBLIC_FLOW_ACCESS_NODE || "https://rest-testnet.onflow.org",
  "discovery.wallet": process.env.NEXT_PUBLIC_FLOW_DISCOVERY_WALLET || "https://fcl-discovery.onflow.org/testnet/authn",
  "app.detail.title": "FlowPilot",
  "app.detail.icon": "https://flowpilot.app/icon.png",
});
