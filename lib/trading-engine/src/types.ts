/** Five-point trend / narrative scale used across market layers */
export type TrendScoreLabel =
  | "strong_bullish"
  | "bullish"
  | "neutral"
  | "bearish"
  | "strong_bearish";

export type NarrativeScoreLabel =
  | "hot"
  | "active"
  | "neutral"
  | "weak"
  | "dead";

export type SetupType =
  | "breakout_retest"
  | "double_bottom"
  | "trendline_reclaim"
  | "trend_continuation";

export type SrClarity = "extremely_obvious" | "clean" | "medium" | "forced";

export type RetestConfirmation =
  | "strong"
  | "decent"
  | "weak"
  | "none";

export type HtfAlignment = "full" | "partial" | "conflict";

export type LiquiditySpace = "major_clean" | "moderate" | "heavy_resistance";

export type RelVolumeBucket = "above_2x" | "one_point_five_x" | "average" | "below_average";

export type MomentumCandle = "explosive" | "strong" | "weak";

export type ExpansionVelocity = "aggressive" | "healthy" | "slow";

export type EntryEfficiency = "perfect" | "decent" | "chased";

export type ResistanceDistance = "large" | "decent" | "nearby";

export type SlEfficiency = "structural" | "acceptable" | "poor";

export type RiskSeverity = "low" | "elevated" | "high";

export type TradeClassification =
  | "reject"
  | "watchlist_only"
  | "balanced_trade"
  | "aggressive_trade"
  | "asymmetric_swing_trade";

/** Full discretionary → quantified input */
export interface EngineTradeInput {
  market: {
    btcTrend: TrendScoreLabel;
    altTrend: TrendScoreLabel;
    narrative: NarrativeScoreLabel;
  };
  structure: {
    setupType: SetupType;
    srClarity: SrClarity;
    retestConfirmation: RetestConfirmation;
    htfAlignment: HtfAlignment;
    liquiditySpace: LiquiditySpace;
  };
  momentum: {
    /** dailyVolume / marketCap */
    volumeToMcapRatio: number;
    relVolume: RelVolumeBucket;
    candleStrength: MomentumCandle;
    expansionVelocity: ExpansionVelocity;
  };
  entry: {
    /** reward / risk (unitless) */
    rrNumeric: number;
    entryEfficiency: EntryEfficiency;
    distanceToResistance: ResistanceDistance;
    slEfficiency: SlEfficiency;
  };
  risk: {
    marketVolatility: RiskSeverity;
    positionConcentration: RiskSeverity;
    correlationExposure: RiskSeverity;
  };
  execution?: {
    stopLossPct: number;
    tp1Pct: number;
    tp2Pct: number;
  };
}

export interface FactorBreakdownRow {
  layer: "market" | "structure" | "momentum" | "entry" | "risk";
  factorKey: string;
  weightInLayer: number;
  rawScore: number;
  weightedContribution: number;
  inputSnapshot: Record<string, unknown>;
}

export interface LayerScore {
  layer: FactorBreakdownRow["layer"];
  score: number;
  /** Weight applied in final formula (e.g. 0.25 for market) */
  layerWeight: number;
  weighted: number;
  factors: FactorBreakdownRow[];
}

export interface AllocationPlan {
  minPct: number;
  maxPct: number;
  targetPct: number;
  /** Minimum RR implied by chosen allocation band (institutional guardrail) */
  impliedMinRr: number;
  adjustments: string[];
}

export interface EngineScoreResult {
  engineVersion: string;
  normalizedScore: number;
  combinedRaw: number;
  classification: TradeClassification;
  layers: LayerScore[];
  allocation: AllocationPlan;
  expectedRr: number;
  rrFromExecution?: number;
  warnings: string[];
  approval: { approved: boolean; reason: string };
  /** Serialized-friendly breakdown for DB */
  factorRows: FactorBreakdownRow[];
}

export interface UserRiskSettings {
  baseAccountEquity: number;
  /** Hard cap on any single position as % of equity */
  maxSinglePositionPct: number;
  /** Optional override for factor weights / layer weights */
  factorConfig?: Partial<EngineConfig>;
}

/** Serializable engine configuration */
export interface EngineConfig {
  layerWeights: {
    market: number;
    structure: number;
    momentum: number;
    entry: number;
    risk: number;
  };
  market: { btc: number; alt: number; narrative: number };
  structure: {
    setup: number;
    sr: number;
    retest: number;
    htf: number;
    liquidity: number;
  };
  momentum: {
    volMcap: number;
    relVol: number;
    candle: number;
    velocity: number;
  };
  entry: {
    rr: number;
    entryEff: number;
    resistance: number;
    sl: number;
  };
  risk: {
    vol: number;
    concentration: number;
    correlation: number;
  };
  classificationThresholds: {
    rejectBelow: number;
    watchlistMax: number;
    balancedMax: number;
    aggressiveMax: number;
  };
  allocationBands: Record<
    Exclude<TradeClassification, "reject" | "watchlist_only">,
    { min: number; max: number }
  >;
}

export interface ClosedTradeForAnalytics {
  id: string;
  classification: TradeClassification | string;
  setupType: string;
  coin: string;
  timeframe?: string;
  outcome: "win" | "loss" | "breakeven" | string | null;
  pnlPct: number | null;
  pnlAbsolute?: number | null;
  holdDurationHours?: number | null;
  suggestedRr?: number | null;
  finalScore?: number | null;
  marketRegime?: string | null;
  mistakeTags?: string[] | null;
  psychologyTags?: string[] | null;
  wasRejectedByEngine?: boolean;
  hypothetical?: boolean;
  openedAt: Date;
  closedAt?: Date | null;
}

export interface AnalyticsReport {
  sampleSize: number;
  winRate: number;
  expectancyRPerTrade: number;
  avgRr: number;
  avgHoldHours: number;
  profitFactor: number;
  maxDrawdownPct: number;
  bestSetups: { setup: string; tradeCount: number; winRate: number; pnlPctSum: number }[];
  worstSetups: { setup: string; tradeCount: number; winRate: number; pnlPctSum: number }[];
  bestAssets: { coin: string; tradeCount: number; winRate: number; pnlPctSum: number }[];
  bestTimeframes: { timeframe: string; tradeCount: number; winRate: number; pnlPctSum: number }[];
  mistakeFrequency: { tag: string; count: number }[];
  psychologicalErrors: { tag: string; count: number }[];
  byMarketRegime: Record<
    string,
    { tradeCount: number; winRate: number; pnlPctSum: number }
  >;
  rejectedFollowup?: {
    hypotheticalWins: number;
    falseNegatives: number;
    tracked: number;
  };
}
