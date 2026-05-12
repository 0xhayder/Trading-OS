import type { EngineConfig, TradeClassification } from "../types";

/** @deprecated Prefer pipeline classifyFromScore — kept for admin tooling that maps raw score only. */
export function classifyScore(normalizedScore: number, cfg: EngineConfig): TradeClassification {
  const t = cfg.classificationThresholds;
  if (normalizedScore <= t.rejectMax) return "reject";
  if (normalizedScore <= t.watchlistMax) return "watchlist_only";
  if (normalizedScore <= t.standardMax) return "standard_trade";
  if (normalizedScore <= t.highConvictionMax) return "high_conviction_trade";
  return "expansion_trade";
}

export function classificationToDisplayName(c: TradeClassification): string {
  switch (c) {
    case "reject":
      return "Reject Trade";
    case "watchlist_only":
      return "Watchlist Only";
    case "standard_trade":
      return "Standard Trade";
    case "high_conviction_trade":
      return "High Conviction Trade";
    case "expansion_trade":
      return "Expansion Trade";
    default:
      return String(c);
  }
}
