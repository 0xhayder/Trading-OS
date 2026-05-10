import {
  mapLegacyJournalToEngine,
  scoreEngineTrade,
  toLegacyApiScore,
  type EngineScoreResult,
} from "@workspace/trading-engine";

export interface TradeInputForScoring {
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
}

export interface TradeScore {
  finalScore: number;
  tradeStatus: string;
  suggestedAllocationPct: number;
  suggestedSlPct: number;
  suggestedTpStructure: string;
  suggestedRr: number;
  tradeWarnings: string;
  calculatedRisk: number;
  expectedProfitPct: number;
  expectedLossPct: number;
  finalDecision: string;
}

export interface ScoreContext {
  baseAccountEquity: number;
  maxSinglePositionPct: number;
}

export interface EvaluatedTrade {
  engine: EngineScoreResult;
  tradeScore: TradeScore;
  persistence: {
    tradeClassification: string;
    engineVersion: string;
    scoreBreakdown: unknown;
    wasRejectedByEngine: boolean;
  };
}

const DEFAULT_CONTEXT: ScoreContext = {
  baseAccountEquity: 10_000,
  maxSinglePositionPct: 25,
};

export function evaluateTradeInput(
  input: TradeInputForScoring,
  ctx: Partial<ScoreContext> = {},
): EvaluatedTrade {
  const c = { ...DEFAULT_CONTEXT, ...ctx };
  const engineInput = mapLegacyJournalToEngine({
    btcCondition: input.btcCondition,
    altCondition: input.altCondition,
    narrativeStrength: input.narrativeStrength,
    setupType: input.setupType,
    levelClarity: input.levelClarity,
    timeframeAlignment: input.timeframeAlignment,
    retestQuality: input.retestQuality,
    volumeStrength: input.volumeStrength,
    candleImpulse: input.candleImpulse,
    followThrough: input.followThrough,
    entryDistance: input.entryDistance,
    spaceToResistance: input.spaceToResistance,
    rrQuality: input.rrQuality,
    overextension: input.overextension,
    eventRisk: input.eventRisk,
    liquidityRisk: input.liquidityRisk,
    stopLossPct: input.stopLossPct,
    tp1Pct: input.tp1Pct,
    tp2Pct: input.tp2Pct,
  });

  const engine = scoreEngineTrade(engineInput, {
    baseAccountEquity: c.baseAccountEquity,
    maxSinglePositionPct: c.maxSinglePositionPct,
  });

  const legacy = toLegacyApiScore(engine, {
    stopLossPct: input.stopLossPct,
    tp1Pct: input.tp1Pct,
    tp2Pct: input.tp2Pct,
  });

  const tradeScore: TradeScore = {
    finalScore: legacy.finalScore,
    tradeStatus: legacy.tradeStatus,
    suggestedAllocationPct: legacy.suggestedAllocationPct,
    suggestedSlPct: legacy.suggestedSlPct,
    suggestedTpStructure: legacy.suggestedTpStructure,
    suggestedRr: legacy.suggestedRr,
    tradeWarnings: legacy.tradeWarnings,
    calculatedRisk: legacy.calculatedRisk,
    expectedProfitPct: legacy.expectedProfitPct,
    expectedLossPct: legacy.expectedLossPct,
    finalDecision: legacy.finalDecision,
  };

  return {
    engine,
    tradeScore,
    persistence: {
      tradeClassification: engine.classification,
      engineVersion: legacy.engineVersion,
      scoreBreakdown: legacy.scoreBreakdown,
      wasRejectedByEngine: engine.classification === "reject",
    },
  };
}

/** @deprecated Prefer `evaluateTradeInput` when persistence metadata is required */
export function scoreTradeInput(
  input: TradeInputForScoring,
  ctx?: Partial<ScoreContext>,
): TradeScore {
  return evaluateTradeInput(input, ctx).tradeScore;
}
