export interface StrategyJSON {
  principal_usd: number;
  target_return_pct: number;
  time_horizon_days: number;
  exit_threshold_pct: number;
  max_single_protocol_pct: number;
  strategy_type: "conservative" | "balanced" | "growth";
  rebalance_frequency_days: number;
  allocations: {
    protocol: string;
    percentage: number;
    type: "lending" | "lp" | "staking";
  }[];
}

export interface VaultRecord {
  id: string;
  user_email: string;
  flow_address: string;
  vault_id: number;
  strategy: StrategyJSON;
  ipfs_cid: string;
  created_at: string;
  status: "active" | "paused" | "completed";
  current_value_usd: number;
  principal_usd: number;
}
