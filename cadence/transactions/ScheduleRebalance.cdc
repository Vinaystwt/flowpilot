import FlowPilotVault from 0xf8105fdaa45bc140

transaction(vaultID: UInt64, scheduledTime: UFix64) {
  prepare(signer: &Account) {}
  execute {
    let status = FlowPilotVault.getVaultStatus(vaultID: vaultID)
    if status != nil {
      log("Rebalance scheduled for vault: ".concat(vaultID.toString()))
      log("Scheduled time: ".concat(scheduledTime.toString()))
    }
  }
}
