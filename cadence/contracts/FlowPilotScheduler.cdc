access(all) contract FlowPilotScheduler {

    access(all) event RebalanceScheduled(
        vaultID: String,
        scheduledTime: UFix64,
        strategyType: String,
        rebalanceFrequencyDays: UInt64
    )

    access(all) event RebalanceExecuted(
        vaultID: String,
        executedAt: UFix64,
        newValue: UFix64
    )

    access(all) struct ScheduledRebalance {
        access(all) let vaultID: String
        access(all) let scheduledTime: UFix64
        access(all) let strategyType: String
        access(all) let rebalanceFrequencyDays: UInt64
        access(all) let createdAt: UFix64
        access(all) var executed: Bool

        init(
            vaultID: String,
            scheduledTime: UFix64,
            strategyType: String,
            rebalanceFrequencyDays: UInt64
        ) {
            self.vaultID = vaultID
            self.scheduledTime = scheduledTime
            self.strategyType = strategyType
            self.rebalanceFrequencyDays = rebalanceFrequencyDays
            self.createdAt = getCurrentBlock().timestamp
            self.executed = false
        }
    }

    access(all) var totalScheduled: UInt64
    access(self) var schedules: {UInt64: ScheduledRebalance}

    access(all) fun scheduleRebalance(
        vaultID: String,
        scheduledTime: UFix64,
        strategyType: String,
        rebalanceFrequencyDays: UInt64
    ): UInt64 {
        self.totalScheduled = self.totalScheduled + 1
        let schedule = ScheduledRebalance(
            vaultID: vaultID,
            scheduledTime: scheduledTime,
            strategyType: strategyType,
            rebalanceFrequencyDays: rebalanceFrequencyDays
        )
        self.schedules[self.totalScheduled] = schedule
        emit RebalanceScheduled(
            vaultID: vaultID,
            scheduledTime: scheduledTime,
            strategyType: strategyType,
            rebalanceFrequencyDays: rebalanceFrequencyDays
        )
        return self.totalScheduled
    }

    access(all) fun getSchedule(scheduleID: UInt64): ScheduledRebalance? {
        return self.schedules[scheduleID]
    }

    access(all) fun getTotalScheduled(): UInt64 {
        return self.totalScheduled
    }

    init() {
        self.totalScheduled = 0
        self.schedules = {}
    }
}
