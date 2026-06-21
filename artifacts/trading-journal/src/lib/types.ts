export type SetupType = "Breakout Retest" | "Double Bottom" | "Trendline Reclaim" | "Trend Continuation" | "Other" | (string & {});
export type NarrativeCategory = "AI" | "DeFi" | "RWA" | "Infrastructure" | "Gaming" | "Meme" | "Other" | (string & {});
export type MarketCapTier = "Micro Cap" | "Small Cap" | "Mid Cap" | "Large Cap";
export type TradeTimeframe = "Weekly" | "Daily" | "4H" | "1H" | (string & {});
/** Five-point BTC / alts regime trend */
export type MarketTrend =
  | "Extreme Bullish"
  | "Bullish"
  | "Neutral"
  | "Bearish"
  | "Extreme Bearish";
/** Token market structure on a single timeframe */
export type TokenMarketStructure = "Bullish" | "Ranging" | "Bearish";
export type BtcVolatilityState = "Calm" | "Elevated" | "Violent";
export type NarrativeHeat = "Dead" | "Weak" | "Neutral" | "Active" | "Hot" | "Euphoric";
/** @deprecated Legacy rows only */
export type StructureBias = "Bullish" | "Neutral" | "Bearish";
/** @deprecated Legacy rows only */
export type BreakoutState = "Clean Breakout" | "Wick Breakout" | "No Breakout";
/** @deprecated Legacy rows only */
export type ReclaimStatus = "Fully Reclaimed" | "Attempting Reclaim" | "Lost Level";
/** @deprecated Legacy rows only */
export type HtfLocation = "At Major Support" | "Mid Range" | "Near Resistance" | "Price Discovery";
/** @deprecated Legacy rows only */
export type LowerTfEntryStructure = "Bullish" | "Neutral" | "Weak";
export type VolumeState = "Weak" | "Normal" | "Expansion" | "Extreme Expansion";
export type RelativeVolume = "Below Average" | "Average" | "High" | "Extreme";
export type PostBreakoutBehavior = "Immediate Continuation" | "Holding" | "Stalling" | "Failing";
export type EntryLocation = "At Key Level" | "Slightly Extended" | "Chased";
export type Overextension = "Calm" | "Extended" | "Euphoric";
export type EventRisk = "Low" | "Medium" | "High";
export type LiquidityStability = "Stable" | "Moderate" | "Thin" | "Dangerous";
export type MoveSlRule = "Never" | "After TP1" | "After Structure Shift" | "Manual";
export type InvalidationType = "Structure Loss" | "Support Loss" | "Volume Failure" | "BTC Weakness";
export type PrimaryMistakeTag =
  | "Early Entry"
  | "Chased Entry"
  | "No Confirmation"
  | "Ignored Higher TF Trend"
  | "Emotional Exit"
  | "Revenge Trade"
  | "Forced Setup"
  | "Poor RR"
  | "Ignored BTC Weakness"
  | "Ignored Volume Weakness"
  | "Moved SL Emotionally"
  | "Oversized Position"
  | "FOMO Entry"
  | "No Clear Structure"
  | "Overtrading";

export type TradeStatus = "Historical Insight" | "Legacy" | (string & {});
export type TradeOutcome = "win" | "loss" | "breakeven";

export interface TradeInput {
  coin: string;
  setupType: SetupType;
  narrativeCategory: NarrativeCategory;
  marketCapTier: MarketCapTier;
  timeframe: TradeTimeframe;
  btcTrend: MarketTrend;
  altTrend: MarketTrend;
  btcVolatilityState: BtcVolatilityState;
  narrativeHeat: NarrativeHeat;
  tokenHigherTfStructure: TokenMarketStructure;
  tokenMidTfStructure: TokenMarketStructure;
  tokenLowerTfStructure: TokenMarketStructure;
  volumeState: VolumeState;
  relativeVolume: RelativeVolume;
  postBreakoutBehavior: PostBreakoutBehavior;
  /** @deprecated Legacy rows only */
  entryPrice?: number;
  /** @deprecated Legacy rows only */
  stopLossPrice?: number;
  /** @deprecated Legacy rows only */
  tp1Price?: number;
  /** @deprecated Legacy rows only */
  tp2Price?: number;
  /** @deprecated Legacy rows only */
  tp3Price?: number;
  stopLossPct: number;
  tp1Pct?: number;
  tp2Pct?: number;
  tp3Pct?: number;
  tp1PositionPct: number;
  tp2PositionPct: number;
  tp3PositionPct: number;
  entryLocation: EntryLocation;
  overextension: Overextension;
  eventRisk: EventRisk;
  liquidityStability: LiquidityStability;
  moveSlRule: MoveSlRule;
  invalidationType: InvalidationType;
  notes: string;

  /** Legacy fields kept optional so older saved rows remain renderable. */
  btcHigherTfStructure?: StructureBias;
  btcMidTfStructure?: StructureBias;
  altHigherTfStructure?: StructureBias;
  altMidTfStructure?: StructureBias;
  breakoutState?: BreakoutState;
  reclaimStatus?: ReclaimStatus;
  htfLocation?: HtfLocation;
  lowerTfEntryStructure?: LowerTfEntryStructure;
  btcCondition?: string;
  altCondition?: string;
  narrativeStrength?: string;
  levelClarity?: string;
  timeframeAlignment?: string;
  retestQuality?: string;
  volumeStrength?: string;
  candleImpulse?: string;
  followThrough?: string;
  entryDistance?: string;
  spaceToResistance?: string;
  rrQuality?: string;
  liquidityRisk?: string;
}

export interface ScoreResult {
  historicalSnapshot?: HistoricalSnapshot;
  finalScore: number;
  tradeStatus: TradeStatus;
  suggestedAllocationPct: number;
  suggestedSlPct: number;
  suggestedTpStructure: string;
  suggestedRr: number;
  warnings: string[];
  finalDecision: string;
  /** When this score was produced (ISO). Shown on the decision screen. */
  scoredAt?: string;
  /** Legacy engine payload, missing on similarity-based rows */
  presentation?: unknown;
  /** Raw persisted engine diagnostics for details after reload. */
  scoreBreakdown?: Record<string, unknown>;
}

export interface HistoricalSnapshot {
  similarTradesFound: number;
  averageSimilarityPct: number;
  nearMatches: number;
  strongMatches: number;
  looseMatches: number;
  historicalWinRate: number;
  historicalBreakevenRate: number;
  historicalLossRate: number;
  averageReturnPct: number;
  bestHistoricalTradePct: number | null;
  worstHistoricalTradePct: number | null;
  expectedReturnPct: number;
  weightedHistoricalWinRate: number;
  confidenceLevel: "Low Confidence" | "Medium Confidence" | "High Confidence" | "Very High Confidence";
  generatedAt: string;
}

export interface Trade extends TradeInput, ScoreResult {
  id: string;
  createdAt: string;
  closedAt?: string;
  allocatedAmountUsd?: number;
  realizedPnlUsd?: number;
  outcome?: TradeOutcome;
  actualPnlPct?: number;
  mistakeTags?: PrimaryMistakeTag[];
  mistakeNote?: string;
  closeNotes?: string;
  managementNotes?: string;
  executionAnalysis?: string;
}

export interface WatchlistTrade extends TradeInput, ScoreResult {
  id: string;
  createdAt: string;
  outcome?: string;
  notes: string;
}

export interface Settings {
  totalCapital: number;
}

export type CapitalAdjustmentType = "add" | "withdraw";

export interface CapitalAdjustment {
  id: string;
  adjustmentType: CapitalAdjustmentType;
  amountUsd: number;
  note?: string;
  createdAt: string;
}
