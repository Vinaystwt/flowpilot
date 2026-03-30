access(all) contract FlowPilotVault {

    access(all) event VaultCreated(
        vaultID: UInt64,
        owner: Address,
        principalUSD: UFix64,
        targetReturnPct: UFix64,
        horizonDays: UInt64
    )
    access(all) event VaultRebalanced(vaultID: UInt64, timestamp: UFix64)
    access(all) event VaultExited(vaultID: UInt64, finalValue: UFix64, gain: UFix64)
    access(all) event PerformanceReportGenerated(vaultID: UInt64, currentValue: UFix64, gainPct: UFix64)

    access(all) struct VaultStatus {
        access(all) let id: UInt64
        access(all) let owner: Address
        access(all) let principalUSD: UFix64
        access(all) let targetReturnPct: UFix64
        access(all) let exitThresholdPct: UFix64
        access(all) let horizonDays: UInt64
        access(all) let maxSingleProtocolPct: UFix64
        access(all) let rebalanceFrequencyDays: UInt64
        access(all) let strategyType: String
        access(all) let ipfsCID: String
        access(all) var currentValueUSD: UFix64
        access(all) var lastRebalanced: UFix64
        access(all) var isActive: Bool

        init(
            id: UInt64,
            owner: Address,
            principalUSD: UFix64,
            targetReturnPct: UFix64,
            exitThresholdPct: UFix64,
            horizonDays: UInt64,
            maxSingleProtocolPct: UFix64,
            rebalanceFrequencyDays: UInt64,
            strategyType: String,
            ipfsCID: String
        ) {
            self.id = id
            self.owner = owner
            self.principalUSD = principalUSD
            self.targetReturnPct = targetReturnPct
            self.exitThresholdPct = exitThresholdPct
            self.horizonDays = horizonDays
            self.maxSingleProtocolPct = maxSingleProtocolPct
            self.rebalanceFrequencyDays = rebalanceFrequencyDays
            self.strategyType = strategyType
            self.ipfsCID = ipfsCID
            self.currentValueUSD = principalUSD
            self.lastRebalanced = getCurrentBlock().timestamp
            self.isActive = true
        }
    }

    access(all) var totalVaults: UInt64
    access(self) var vaults: {UInt64: VaultStatus}

    access(all) fun createVault(
        owner: Address,
        principalUSD: UFix64,
        targetReturnPct: UFix64,
        exitThresholdPct: UFix64,
        horizonDays: UInt64,
        maxSingleProtocolPct: UFix64,
        rebalanceFrequencyDays: UInt64,
        strategyType: String,
        ipfsCID: String
    ): UInt64 {
        self.totalVaults = self.totalVaults + 1
        let vault = VaultStatus(
            id: self.totalVaults,
            owner: owner,
            principalUSD: principalUSD,
            targetReturnPct: targetReturnPct,
            exitThresholdPct: exitThresholdPct,
            horizonDays: horizonDays,
            maxSingleProtocolPct: maxSingleProtocolPct,
            rebalanceFrequencyDays: rebalanceFrequencyDays,
            strategyType: strategyType,
            ipfsCID: ipfsCID
        )
        self.vaults[self.totalVaults] = vault
        emit VaultCreated(
            vaultID: self.totalVaults,
            owner: owner,
            principalUSD: principalUSD,
            targetReturnPct: targetReturnPct,
            horizonDays: horizonDays
        )
        return self.totalVaults
    }

    access(all) fun getVaultStatus(vaultID: UInt64): VaultStatus? {
        return self.vaults[vaultID]
    }

    access(all) fun getTotalVaults(): UInt64 {
        return self.totalVaults
    }

    init() {
        self.totalVaults = 0
        self.vaults = {}
    }
}
