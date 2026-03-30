import * as fcl from "@onflow/fcl";

fcl.config({
  "flow.network": "testnet",
  "accessNode.api": "https://rest-testnet.onflow.org",
  "discovery.wallet": "https://fcl-discovery.onflow.org/testnet/authn",
  "app.detail.title": "FlowPilot",
  "app.detail.icon": "https://flowpilot-puce.vercel.app/favicon.svg",
  "app.detail.url": "https://flowpilot-puce.vercel.app",
});

export { fcl };
export const CONTRACT_ADDRESS = "0xf8105fdaa45bc140";
