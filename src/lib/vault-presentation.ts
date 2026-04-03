import { StrategyJSON } from "@/lib/types";

export function formatShortHash(value: string, chars = 10) {
  if (!value) return "";
  if (value.length <= chars * 2) return value;
  return `${value.slice(0, chars)}...${value.slice(-Math.max(6, Math.floor(chars / 2)))}`;
}

export function getScenarioMultiplier(strategyType: StrategyJSON["strategy_type"]) {
  if (strategyType === "growth") return 1.55;
  if (strategyType === "balanced") return 1.35;
  return 1.15;
}

export function getScenarioPreview(strategy: StrategyJSON, principal = strategy.principal_usd) {
  const upsideMultiplier = getScenarioMultiplier(strategy.strategy_type);

  return [
    {
      label: "Protected",
      returnPct: strategy.exit_threshold_pct,
      terminalValue: principal * (1 + strategy.exit_threshold_pct / 100),
      color: "#ff4466",
    },
    {
      label: "Base",
      returnPct: strategy.target_return_pct,
      terminalValue: principal * (1 + strategy.target_return_pct / 100),
      color: "#00d4ff",
    },
    {
      label: "Upside",
      returnPct: Number((strategy.target_return_pct * upsideMultiplier).toFixed(2)),
      terminalValue: principal * (1 + (strategy.target_return_pct * upsideMultiplier) / 100),
      color: "#00ff88",
    },
  ];
}

export function getConvictionScore(vault: {
  principal_usd: number;
  current_value_usd: number;
  created_at: string;
  strategy: StrategyJSON;
}) {
  const gainPct = ((vault.current_value_usd - vault.principal_usd) / vault.principal_usd) * 100;
  const returnProgress = gainPct / Math.max(vault.strategy.target_return_pct, 0.01);
  const daysLive = Math.max(1, (Date.now() - new Date(vault.created_at).getTime()) / (1000 * 60 * 60 * 24));
  const horizonProgress = daysLive / Math.max(vault.strategy.time_horizon_days, 1);
  const strategyBonus = vault.strategy.strategy_type === "conservative" ? 20 : vault.strategy.strategy_type === "balanced" ? 15 : 10;

  return Math.min(100, Math.max(0, Math.round(returnProgress * 50 + horizonProgress * 30 + strategyBonus)));
}

export function getIpfsLink(cid: string, preferredUrl?: string) {
  if (preferredUrl) return preferredUrl;
  if (!cid) return "";
  return `https://storacha.link/ipfs/${cid}`;
}
