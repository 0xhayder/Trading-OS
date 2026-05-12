/** Five-point trend / narrative scale used across market layers */
export type TrendScoreLabel =
  | "strong_bullish"
  | "bullish"
  | "neutral"
  | "bearish"
  | "strong_bearish";

export type NarrativeScoreLabel = "hot" | "active" | "neutral" | "weak" | "dead";

export type SetupType =
  | "breakout_retest"
  | "double_bottom"
  | "trendline_reclaim"
  | "trend_continuation";

export type SrClarity = "extremely_obvious" | "clean" | "medium" | "forced";

export type RetestConfirmation = "strong" | "decent" | "weak" | "none";

export type HtfAlignment = "full" | "partial" | "conflict";

/** Legacy structural liquidity bucket; optional context for filters / analytics */
export type LiquiditySpace = "major_clean" | "moderate" | "heavy_resistance";

export type RelVolumeBucket = "above_2x" | "one_point_five_x" | "average" | "below_average";

export type MomentumCandle = "explosive" | "strong" | "weak";

export type ExpansionVelocity = "aggressive" | "healthy" | "slow";

export type EntryEfficiency = "perfect" | "decent" | "chased";

export type ResistanceDistance = "large" | "decent" | "nearby";

export type RrQualityBand = "strong" | "acceptable" | "poor";

export type OverextensionBand = "controlled" | "extended" | "euphoric";

export type EventRiskBand = "low" | "medium" | "high";

export type LiquidityRiskBand = "safe" | "caution" | "dangerous";

export type SlEfficiency = "structural" | "acceptable" | "poor";

/** Post–multi-layer pipeline trade buckets */
export type TradeClassification =
  | "reject"
  | "watchlist_only"
  | "standard_trade"
  | "high_conviction_trade"
  | "expansion_trade";

export type AggressionLevel = "none" | "cautious" | "standard" | "elevated" | "maximum";

export interface RrEngineOutput {
  suggestedSlPct: number;
  suggestedRrStructure: string;
  runnerAllowed: boolean;
  multiTpScaling: boolean;
  asymmetricRrPreferred: boolean;
  rrAggressionTolerance: number;
  notes: string[];
}

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
    /** dailyVolume / marketCap — reserved for ML / future weighting */
    volumeToMcapRatio: number;
    relVolume: RelVolumeBucket;
    candleStrength: MomentumCandle;
    expansionVelocity: ExpansionVelocity;
  };
  entry: {
    /** reward / risk (unitless) */
    rrNumeric: number;
    rrQuality: RrQualityBand;
    entryEfficiency: EntryEfficiency;
    distanceToResistance: ResistanceDistance;
    slEfficiency: SlEfficiency;
  };
  risk: {
    overextension: OverextensionBand;
    eventRisk: EventRiskBand;
    liquidityRisk: LiquidityRiskBand;
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
  /** Internal blend in roughly [-2, 1] before 0–100 mapping */
  score: number;
  /** 0–100 layer quality for dashboards */
  score100: number;
  /** Effective weight in final 0–100 blend (sums to 1 across layers) */
  layerWeight: number;
  /** Contribution to final 0–100 score */
  weighted: number;
  factors: FactorBreakdownRow[];
}

export interface AllocationPlan {
  minPct: number;
  maxPct: number;
  targetPct: number;
  impliedMinRr: number;
  adjustments: string[];
  /** Nonlinear curve identifier for analytics */
  curveId: string;
}

export interface HardFilterTrace {
  ruleId: string;
  action: "pass" | "reject" | "watchlist_only" | "cap_classification" | "compress";
  detail: string;
}

export interface PipelineDiagnostics {
  hardFilters: HardFilterTrace[];
  conditionalRules: string[];
  positiveSynergies: string[];
  negativeSynergies: string[];
  riskCompression: string[];
  classificationDowngradeReasons: string[];
  /** Opaque numeric fingerprint for backtests / ML */
  hiddenBlendFingerprint: number;
}

export interface EngineScoreResult {
  engineVersion: string;
  normalizedScore: number;
  /** Monotonic raw blend in [-1, 1] for legacy charts */
  combinedRaw: number;
  classification: TradeClassification;
  layers: LayerScore[];
  allocation: AllocationPlan;
  expectedRr: number;
  rrFromExecution?: number;
  rrEngine: RrEngineOutput;
  warnings: string[];
  approval: { approved: boolean; reason: string };
  factorRows: FactorBreakdownRow[];
  layerScores100: Record<LayerScore["layer"], number>;
  activeSynergies: string[];
  activePenalties: string[];
  aggressionLevel: AggressionLevel;
  confidenceStability: number;
  reasoningSummary: string;
  diagnostics: PipelineDiagnostics;
}

export interface UserRiskSettings {
  baseAccountEquity: number;
  maxSinglePositionPct: number;
  factorConfig?: Partial<EngineConfig>;
}

export interface EngineConfig {
  layerWeights: {
    structure: number;
    market: number;
    momentum: number;
    entry: number;
    risk: number;
  };
  structure: {
    retest: number;
    levelClarity: number;
    htf: number;
  };
  market: { btc: number; alt: number; narrative: number };
  momentum: {
    volume: number;
    candle: number;
    followThrough: number;
  };
  entry: {
    entryDistance: number;
    resistanceSpace: number;
    rrQuality: number;
  };
  risk: {
    overextension: number;
    eventRisk: number;
    liquidityRisk: number;
  };
  classificationThresholds: {
    rejectMax: number;
    watchlistMax: number;
    standardMax: number;
    highConvictionMax: number;
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
  byMarketRegime: Record<string, { tradeCount: number; winRate: number; pnlPctSum: number }>;
  rejectedFollowup?: {
    hypotheticalWins: number;
    falseNegatives: number;
    tracked: number;
  };
}
