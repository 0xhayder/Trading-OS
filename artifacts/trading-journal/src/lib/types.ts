export interface TradeInput {
  coin: string;
  setupType: string;
  timeframe: string;
  btcCondition: string;
  altCondition: string;
  narrativeStrength: string;
  levelClarity: string;
  timeframeAlignment: string;
  retestQuality: string;
  volumeStrength: string;
  candleImpulse: string;
  followThrough: string;
  stopLossPct: number;
  tp1Pct: number;
  tp2Pct: number;
  entryDistance: string;
  spaceToResistance: string;
  rrQuality: string;
  overextension: string;
  eventRisk: string;
  liquidityRisk: string;
  notes: string;
  mode: "trade" | "watchlist";
}

export interface TradeScore {
  finalScore: number;
  tradeStatus: "Reject" | "Watchlist" | "Standard Trade" | "High Conviction" | "Expansion Trade";
  suggestedAllocationPct: number;
  suggestedSlPct: number;
  suggestedTpStructure: string;
  suggestedRr: number;
  tradeWarnings: string[];
  calculatedRisk: number;
  expectedProfitPct: number;
  expectedLossPct: number;
  finalDecision: string;
}

export interface Trade extends TradeInput, TradeScore {
  id: string;
  createdAt: string;
  status: "open" | "closed" | "cancelled";
  outcome?: "win" | "loss" | "breakeven";
  actualPnlPct?: number;
  mistakeTags?: string;
  exitPrice?: number;
}

export interface WatchlistItem {
  id: string;
  coin: string;
  setupType: string;
  timeframe: string;
  notes: string;
  outcome?: string;
  createdAt: string;
}

export interface Settings {
  totalCapital: number;
  riskProfilePct: number;
  defaultRiskPct: number;
  maxAllocationPct: number;
}
