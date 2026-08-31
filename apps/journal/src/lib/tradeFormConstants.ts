export const MARKET_TREND_OPTIONS = [
  "Extreme Bullish",
  "Bullish",
  "Neutral",
  "Bearish",
  "Extreme Bearish",
] as const;

export const TOKEN_STRUCTURE_OPTIONS = ["Bullish", "Ranging", "Bearish"] as const;

export type MarketTrend = (typeof MARKET_TREND_OPTIONS)[number];
export type TokenMarketStructure = (typeof TOKEN_STRUCTURE_OPTIONS)[number];

const MARKET_TREND_SET = new Set<string>(MARKET_TREND_OPTIONS);
const TOKEN_STRUCTURE_SET = new Set<string>(TOKEN_STRUCTURE_OPTIONS);

export function isMarketTrendValue(value: unknown): value is MarketTrend {
  return typeof value === "string" && MARKET_TREND_SET.has(value);
}

export function isTokenStructureValue(value: unknown): value is TokenMarketStructure {
  return typeof value === "string" && TOKEN_STRUCTURE_SET.has(value);
}

/** Map legacy per-TF bullish/neutral/bearish into a single trend label. */
export function legacyBiasPairToTrend(higher?: string, mid?: string): MarketTrend {
  const h = (higher ?? "").toLowerCase();
  const m = (mid ?? "").toLowerCase();
  if (h.includes("bull") && m.includes("bull")) return "Extreme Bullish";
  if (h.includes("bear") && m.includes("bear")) return "Extreme Bearish";
  if (h.includes("bull")) return "Bullish";
  if (h.includes("bear")) return "Bearish";
  return "Neutral";
}

export function legacyStructureRowToToken(row: {
  breakout_state?: string;
  reclaim_status?: string;
  lower_tf_entry_structure?: string;
}): {
  higher: TokenMarketStructure;
  mid: TokenMarketStructure;
  lower: TokenMarketStructure;
} {
  if (isTokenStructureValue(row.breakout_state)) {
    return {
      higher: row.breakout_state,
      mid: isTokenStructureValue(row.reclaim_status) ? row.reclaim_status : "Ranging",
      lower: isTokenStructureValue(row.lower_tf_entry_structure)
        ? row.lower_tf_entry_structure
        : "Ranging",
    };
  }
  const breakout = (row.breakout_state ?? "").toLowerCase();
  const reclaim = (row.reclaim_status ?? "").toLowerCase();
  const lower = (row.lower_tf_entry_structure ?? "").toLowerCase();
  if (breakout.includes("no") || reclaim.includes("lost")) {
    return { higher: "Bearish", mid: "Bearish", lower: "Bearish" };
  }
  if (breakout.includes("clean") && reclaim.includes("fully")) {
    return {
      higher: "Bullish",
      mid: lower.includes("bull") ? "Bullish" : "Ranging",
      lower: lower.includes("weak") ? "Bearish" : lower.includes("bull") ? "Bullish" : "Ranging",
    };
  }
  return { higher: "Ranging", mid: "Ranging", lower: "Ranging" };
}
