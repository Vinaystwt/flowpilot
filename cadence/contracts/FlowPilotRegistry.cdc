access(all) contract FlowPilotRegistry {

    access(all) event VaultRegistered(userAddress: Address, vaultID: UInt64, ipfsCID: String)
    access(all) event VaultStatusUpdated(vaultID: UInt64, status: String)

    access(all) struct VaultRecord {
        access(all) let vaultID: UInt64
        access(all) let userAddress: Address
        access(all) let ipfsCID: String
        access(all) let createdAt: UFix64

        init(vaultID: UInt64, userAddress: Address, ipfsCID: String) {
            self.vaultID = vaultID
            self.userAddress = userAddress
            self.ipfsCID = ipfsCID
            self.createdAt = getCurrentBlock().timestamp
        }
    }

    access(all) var totalVaults: UInt64
    access(self) var vaults: {UInt64: VaultRecord}

    access(all) fun registerVault(userAddress: Address, ipfsCID: String): UInt64 {
        self.totalVaults = self.totalVaults + 1
        let record = VaultRecord(
            vaultID: self.totalVaults,
            userAddress: userAddress,
            ipfsCID: ipfsCID
        )
        self.vaults[self.totalVaults] = record
        emit VaultRegistered(
            userAddress: userAddress,
            vaultID: self.totalVaults,
            ipfsCID: ipfsCID
        )
        return self.totalVaults
    }

    access(all) fun getVault(vaultID: UInt64): VaultRecord? {
        return self.vaults[vaultID]
    }

    access(all) fun getAllVaults(): [VaultRecord] {
        return self.vaults.values
    }

    init() {
        self.totalVaults = 0
        self.vaults = {}
    }
}
