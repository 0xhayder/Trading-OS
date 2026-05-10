import { z } from "zod";

export const trendScoreLabelSchema = z.enum([
  "strong_bullish",
  "bullish",
  "neutral",
  "bearish",
  "strong_bearish",
]);

export const narrativeScoreLabelSchema = z.enum([
  "hot",
  "active",
  "neutral",
  "weak",
  "dead",
]);

export const setupTypeSchema = z.enum([
  "breakout_retest",
  "double_bottom",
  "trendline_reclaim",
  "trend_continuation",
]);

export const engineTradeInputSchema = z.object({
  market: z.object({
    btcTrend: trendScoreLabelSchema,
    altTrend: trendScoreLabelSchema,
    narrative: narrativeScoreLabelSchema,
  }),
  structure: z.object({
    setupType: setupTypeSchema,
    srClarity: z.enum(["extremely_obvious", "clean", "medium", "forced"]),
    retestConfirmation: z.enum(["strong", "decent", "weak", "none"]),
    htfAlignment: z.enum(["full", "partial", "conflict"]),
    liquiditySpace: z.enum(["major_clean", "moderate", "heavy_resistance"]),
  }),
  momentum: z.object({
    volumeToMcapRatio: z.number().finite().nonnegative(),
    relVolume: z.enum(["above_2x", "one_point_five_x", "average", "below_average"]),
    candleStrength: z.enum(["explosive", "strong", "weak"]),
    expansionVelocity: z.enum(["aggressive", "healthy", "slow"]),
  }),
  entry: z.object({
    rrNumeric: z.number().finite().positive(),
    entryEfficiency: z.enum(["perfect", "decent", "chased"]),
    distanceToResistance: z.enum(["large", "decent", "nearby"]),
    slEfficiency: z.enum(["structural", "acceptable", "poor"]),
  }),
  risk: z.object({
    marketVolatility: z.enum(["low", "elevated", "high"]),
    positionConcentration: z.enum(["low", "elevated", "high"]),
    correlationExposure: z.enum(["low", "elevated", "high"]),
  }),
  execution: z
    .object({
      stopLossPct: z.number().positive(),
      tp1Pct: z.number().nonnegative(),
      tp2Pct: z.number().nonnegative(),
    })
    .optional(),
});

export const userRiskSettingsSchema = z.object({
  baseAccountEquity: z.number().positive(),
  maxSinglePositionPct: z.number().positive().max(100),
  factorConfig: z.any().optional(),
});
