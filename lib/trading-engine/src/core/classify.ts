import type { EngineConfig, TradeClassification } from "../types";

export function classifyScore(
  normalizedScore: number,
  cfg: EngineConfig,
): TradeClassification {
  const t = cfg.classificationThresholds;
  if (normalizedScore < t.rejectBelow) return "reject";
  if (normalizedScore < t.watchlistMax) return "watchlist_only";
  if (normalizedScore < t.balancedMax) return "balanced_trade";
  if (normalizedScore < t.aggressiveMax) return "aggressive_trade";
  return "asymmetric_swing_trade";
}

export function classificationToDisplayName(c: TradeClassification): string {
  switch (c) {
    case "reject":
      return "Reject Trade";
    case "watchlist_only":
      return "Watchlist Only";
    case "balanced_trade":
      return "Balanced Trade";
    case "aggressive_trade":
      return "Aggressive Trade";
    case "asymmetric_swing_trade":
      return "Asymmetric Swing Trade";
    default:
      return String(c);
  }
}
