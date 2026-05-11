export type SetupType = "Breakout Retest" | "Double Bottom" | "Trendline Reclaim" | "Trend Continuation";
export type Timeframe = "4H" | "Daily" | "Weekly";
export type MarketCondition = "Strong Bullish" | "Bullish" | "Neutral" | "Bearish" | "Strong Bearish";
export type NarrativeStrength = "Hot" | "Active" | "Neutral" | "Weak" | "Dead";
export type LevelClarity = "Extremely Obvious" | "Clean" | "Medium" | "Forced / Messy";
export type TfAlignment = "Fully Aligned" | "Partially Aligned" | "Counter Trend";
export type RetestQuality = "Strong" | "Decent" | "Weak" | "None";
export type VolumeStrength = "Strong Expansion" | "Normal" | "Weak";
export type CandleImpulse = "Explosive" | "Strong" | "Weak";
export type FollowThrough = "Continuation Present" | "Slowing" | "Failing";
export type EntryDistance = "Perfect" | "Decent" | "Chased";
export type SpaceToResistance = "Large Space" | "Decent Space" | "Limited Space";
export type RRQuality = "RR > 5" | "RR 3 to 5" | "RR 2 to 3" | "RR < 2";
export type Overextension = "Calm" | "Extended" | "Euphoric";
export type EventRisk = "Low" | "Medium" | "High";
export type LiquidityRisk = "High Liquidity" | "Acceptable" | "Dangerous";

export type TradeStatus = "Reject Trade" | "Watchlist Only" | "Balanced Trade" | "Aggressive Trade" | "Asymmetric Swing Trade";
export type TradeOutcome = "win" | "loss" | "breakeven";

export interface TradeInput {
  coin: string;
  setupType: SetupType;
  timeframe: Timeframe;
  btcCondition: MarketCondition;
  altCondition: MarketCondition;
  narrativeStrength: NarrativeStrength;
  levelClarity: LevelClarity;
  timeframeAlignment: TfAlignment;
  retestQuality: RetestQuality;
  volumeStrength: VolumeStrength;
  candleImpulse: CandleImpulse;
  followThrough: FollowThrough;
  stopLossPct: number;
  tp1Pct: number;
  tp2Pct: number;
  entryDistance: EntryDistance;
  spaceToResistance: SpaceToResistance;
  rrQuality: RRQuality;
  overextension: Overextension;
  eventRisk: EventRisk;
  liquidityRisk: LiquidityRisk;
  notes: string;
}

export interface ScoreResult {
  finalScore: number;
  tradeStatus: TradeStatus;
  suggestedAllocationPct: number;
  suggestedSlPct: number;
  suggestedTpStructure: string;
  suggestedRr: number;
  warnings: string[];
  finalDecision: string;
}

export interface Trade extends TradeInput, ScoreResult {
  id: string;
  createdAt: string;
  allocatedAmountUsd?: number;
  realizedPnlUsd?: number;
  outcome?: TradeOutcome;
  actualPnlPct?: number;
  mistakeTags?: string;
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
