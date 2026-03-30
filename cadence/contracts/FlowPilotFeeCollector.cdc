access(all) contract FlowPilotFeeCollector {

    access(all) event FeeCollected(vaultID: UInt64, amount: UFix64, userAddress: Address)

    access(all) var totalFeesCollected: UFix64

    access(all) fun collectFee(
        vaultID: UInt64,
        gainAmount: UFix64,
        userAddress: Address
    ): UFix64 {
        let feeRate: UFix64 = 0.15
        let feeAmount = gainAmount * feeRate
        self.totalFeesCollected = self.totalFeesCollected + feeAmount
        emit FeeCollected(
            vaultID: vaultID,
            amount: feeAmount,
            userAddress: userAddress
        )
        return feeAmount
    }

    access(all) fun getTotalFeesCollected(): UFix64 {
        return self.totalFeesCollected
    }

    init() {
        self.totalFeesCollected = 0.0
    }
}
