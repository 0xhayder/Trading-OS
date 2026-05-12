import { classificationToDisplayName } from "./core/classify";
import type { EngineScoreResult, EngineTradeInput, SetupType, TrendScoreLabel } from "./types";

/** Best-effort mapping from the legacy journal string enums → engine inputs. */
export function mapLegacyJournalToEngine(input: {
  btcCondition: string;
  altCondition: string;
  narrativeStrength: string;
  setupType: string;
  levelClarity: string;
  timeframeAlignment: string;
  retestQuality: string;
  volumeStrength: string;
  candleImpulse: string;
  followThrough: string;
  entryDistance: string;
  spaceToResistance: string;
  rrQuality: string;
  overextension: string;
  eventRisk: string;
  liquidityRisk: string;
  stopLossPct: number;
  tp1Pct: number;
  tp2Pct: number;
}): EngineTradeInput {
  const btcTrend = mapMarketTrend(input.btcCondition);
  const altTrend = mapMarketTrend(input.altCondition);
  const narrative = mapNarrative(input.narrativeStrength);
  const setupType = mapSetup(input.setupType);
  const srClarity = mapSr(input.levelClarity);
  const htfAlignment = mapHtf(input.timeframeAlignment);
  const retestConfirmation = mapRetest(input.retestQuality);
  const liquiditySpace = mapLiquiditySpaceFromResistance(input.spaceToResistance);

  const relVolume = mapRelVol(input.volumeStrength);
  const candleStrength = mapCandle(input.candleImpulse);
  const expansionVelocity = mapVelocity(input.followThrough);
  const volumeToMcapRatio = inferVolumeMcapFromLegacy(input.volumeStrength);

  const rrNumeric = computeRrFromPct(input.stopLossPct, input.tp1Pct, input.tp2Pct, input.rrQuality);
  const rrQuality = mapRrQualityBand(input.rrQuality, rrNumeric);
  const entryEfficiency = mapEntryEfficiency(input.entryDistance);
  const distanceToResistance = mapResistance(input.spaceToResistance);
  const slEfficiency = inferSlFromRr(input.rrQuality, input.stopLossPct);

  return {
    market: { btcTrend, altTrend, narrative },
    structure: {
      setupType,
      srClarity,
      retestConfirmation,
      htfAlignment,
      liquiditySpace,
    },
    momentum: {
      volumeToMcapRatio,
      relVolume,
      candleStrength,
      expansionVelocity,
    },
    entry: {
      rrNumeric,
      rrQuality,
      entryEfficiency,
      distanceToResistance,
      slEfficiency,
    },
    risk: {
      overextension: mapOverextension(input.overextension),
      eventRisk: mapEventRisk(input.eventRisk),
      liquidityRisk: mapLiquidityRisk(input.liquidityRisk),
    },
    execution: {
      stopLossPct: input.stopLossPct,
      tp1Pct: input.tp1Pct,
      tp2Pct: input.tp2Pct,
    },
  };
}

function mapMarketTrend(s: string): TrendScoreLabel {
  const x = s.toLowerCase();
  if (x.includes("strong") && x.includes("bull")) return "strong_bullish";
  if (x.includes("bull")) return "bullish";
  if (x.includes("strong") && x.includes("bear")) return "strong_bearish";
  if (x.includes("bear")) return "bearish";
  return "neutral";
}

function mapNarrative(s: string): EngineTradeInput["market"]["narrative"] {
  const x = s.toLowerCase();
  if (x.includes("hot")) return "hot";
  if (x.includes("active")) return "active";
  if (x.includes("weak")) return "weak";
  if (x.includes("dead")) return "dead";
  return "neutral";
}

function mapSetup(s: string): SetupType {
  const x = s.toLowerCase();
  if (x.includes("double")) return "double_bottom";
  if (x.includes("trendline")) return "trendline_reclaim";
  if (x.includes("continuation")) return "trend_continuation";
  return "breakout_retest";
}

function mapSr(s: string): EngineTradeInput["structure"]["srClarity"] {
  const x = s.toLowerCase();
  if (x.includes("obvious") || x.includes("extreme")) return "extremely_obvious";
  if (x.includes("forced") || x.includes("messy")) return "forced";
  if (x.includes("decent") || x.includes("clean")) return "clean";
  return "medium";
}

function mapHtf(s: string): EngineTradeInput["structure"]["htfAlignment"] {
  const x = s.toLowerCase();
  if (x.includes("full")) return "full";
  if (x.includes("partial")) return "partial";
  if (x.includes("counter")) return "conflict";
  return "partial";
}

function mapRetest(s: string): EngineTradeInput["structure"]["retestConfirmation"] {
  const x = s.toLowerCase();
  if (x.includes("strong")) return "strong";
  if (x.includes("acceptable") || x.includes("decent")) return "decent";
  if (x.includes("weak")) return "weak";
  return "none";
}

function mapLiquiditySpaceFromResistance(s: string): EngineTradeInput["structure"]["liquiditySpace"] {
  const x = s.toLowerCase();
  if (x.includes("large")) return "major_clean";
  if (x.includes("limited") || x.includes("tight")) return "heavy_resistance";
  return "moderate";
}

function mapRelVol(s: string): EngineTradeInput["momentum"]["relVolume"] {
  const x = s.toLowerCase();
  if (x.includes("strong") || x.includes("expansion")) return "above_2x";
  if (x.includes("normal")) return "average";
  if (x.includes("weak")) return "below_average";
  return "one_point_five_x";
}

function inferVolumeMcapFromLegacy(s: string): number {
  const x = s.toLowerCase();
  if (x.includes("strong") || x.includes("expansion")) return 0.85;
  if (x.includes("normal")) return 0.35;
  return 0.15;
}

function mapCandle(s: string): EngineTradeInput["momentum"]["candleStrength"] {
  const x = s.toLowerCase();
  if (x.includes("explosive")) return "explosive";
  if (x.includes("strong")) return "strong";
  if (x.includes("weak")) return "weak";
  return "strong";
}

function mapVelocity(s: string): EngineTradeInput["momentum"]["expansionVelocity"] {
  const x = s.toLowerCase();
  if (x.includes("continuation") || x.includes("present")) return "aggressive";
  if (x.includes("slowing")) return "healthy";
  if (x.includes("failing")) return "slow";
  return "healthy";
}

function mapEntryEfficiency(s: string): EngineTradeInput["entry"]["entryEfficiency"] {
  const x = s.toLowerCase();
  if (x.includes("optimal") || x.includes("perfect")) return "perfect";
  if (x.includes("extended") || x.includes("chase")) return "chased";
  return "decent";
}

function mapResistance(s: string): EngineTradeInput["entry"]["distanceToResistance"] {
  const x = s.toLowerCase();
  if (x.includes("large")) return "large";
  if (x.includes("limited")) return "nearby";
  return "decent";
}

function mapRrQualityBand(q: string, rrNumeric: number): EngineTradeInput["entry"]["rrQuality"] {
  const x = q.toLowerCase();
  if (x.includes("poor")) return "poor";
  if (x.includes("acceptable") || x.includes("2 to 3")) return "acceptable";
  if (x.includes("asymmetric") || x.includes("> 5") || x.includes("3 to 5")) return "strong";
  if (rrNumeric >= 4) return "strong";
  if (rrNumeric >= 2.2) return "acceptable";
  return "acceptable";
}

function computeRrFromPct(sl: number, tp1: number, tp2: number, rrQuality: string): number {
  if (sl > 0) {
    const rr = (tp1 / sl + tp2 / sl) / 2;
    if (Number.isFinite(rr) && rr > 0) return Math.max(rr, 0.25);
  }
  const q = rrQuality.toLowerCase();
  if (q.includes("> 5") || q.includes("asymmetric")) return 5.5;
  if (q.includes("3 to 5")) return 4;
  if (q.includes("2 to 3") || q.includes("acceptable")) return 2.5;
  return 1.5;
}

function inferSlFromRr(
  rrQuality: string,
  stopLossPct: number,
): EngineTradeInput["entry"]["slEfficiency"] {
  const q = rrQuality.toLowerCase();
  if (q.includes("poor")) return "poor";
  if (stopLossPct > 6) return "acceptable";
  return "structural";
}

function mapOverextension(s: string): EngineTradeInput["risk"]["overextension"] {
  const x = s.toLowerCase();
  if (x.includes("euphor") || x.includes("panic")) return "euphoric";
  if (x.includes("extend")) return "extended";
  return "controlled";
}

function mapEventRisk(s: string): EngineTradeInput["risk"]["eventRisk"] {
  const x = s.toLowerCase();
  if (x.includes("high")) return "high";
  if (x.includes("medium") || x.includes("elevated")) return "medium";
  return "low";
}

function mapLiquidityRisk(s: string): EngineTradeInput["risk"]["liquidityRisk"] {
  const x = s.toLowerCase();
  if (x.includes("danger")) return "dangerous";
  if (x.includes("acceptable") || x.includes("caution") || x.includes("medium")) return "caution";
  return "safe";
}

/** Flatten engine output for API / DB storage */
export interface LegacyApiScorePayload {
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
  engineVersion: string;
  classification: string;
  approvalApproved: boolean;
  approvalReason: string;
  scoreBreakdown: unknown;
}

export function toLegacyApiScore(
  engine: EngineScoreResult,
  execution?: { stopLossPct: number; tp1Pct: number; tp2Pct: number },
): LegacyApiScorePayload {
  const alloc = engine.allocation.targetPct;
  const sl = engine.rrEngine.suggestedSlPct ?? execution?.stopLossPct ?? 1;
  const tp2 = execution?.tp2Pct ?? 0;
  const calculatedRisk = alloc > 0 ? Math.round((sl / 100) * alloc * 100) / 100 : 0;
  const expectedProfitPct = Math.round(alloc * (tp2 / 100) * 100) / 100;
  const expectedLossPct = Math.round(alloc * (sl / 100) * 100) / 100;

  return {
    finalScore: engine.normalizedScore,
    tradeStatus: classificationToDisplayName(engine.classification),
    suggestedAllocationPct: alloc,
    suggestedSlPct: sl,
    suggestedTpStructure:
      execution != null
        ? `${engine.rrEngine.suggestedRrStructure} — TP1 ${execution.tp1Pct}% / TP2 ${execution.tp2Pct}% (${engine.classification.replace(/_/g, " ")})`
        : engine.rrEngine.suggestedRrStructure,
    suggestedRr: engine.expectedRr,
    tradeWarnings: engine.warnings.join(" | "),
    calculatedRisk,
    expectedProfitPct,
    expectedLossPct,
    finalDecision: engine.approval.approved
      ? `APPROVED — ${engine.classification.replace(/_/g, " ")}`
      : `BLOCKED — ${engine.approval.reason}`,
    engineVersion: engine.engineVersion,
    classification: engine.classification,
    approvalApproved: engine.approval.approved,
    approvalReason: engine.approval.reason,
    scoreBreakdown: {
      combinedRaw: engine.combinedRaw,
      layerScores100: engine.layerScores100,
      layers: engine.layers.map((l) => ({
        layer: l.layer,
        score: l.score,
        score100: l.score100,
        weighted: l.weighted,
      })),
      factors: engine.factorRows,
      allocation: engine.allocation,
      activeSynergies: engine.activeSynergies,
      activePenalties: engine.activePenalties,
      aggressionLevel: engine.aggressionLevel,
      confidenceStability: engine.confidenceStability,
      reasoningSummary: engine.reasoningSummary,
      diagnostics: engine.diagnostics,
      rrEngine: engine.rrEngine,
    },
  };
}
