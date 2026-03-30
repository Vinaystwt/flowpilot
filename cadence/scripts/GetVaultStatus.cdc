import FlowPilotVault from 0xf8105fdaa45bc140

access(all) fun main(vaultID: UInt64): {String: AnyStruct}? {
  return FlowPilotVault.getVaultStatus(vaultID: vaultID)
}
