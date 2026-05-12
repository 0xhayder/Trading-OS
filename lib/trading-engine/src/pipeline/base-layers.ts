import type { EngineConfig, EngineTradeInput, FactorBreakdownRow, LayerScore } from "../types";
import {
  candleStrength,
  entryDistanceStrength,
  eventRiskStrength,
  followThroughStrength,
  htfStrength,
  levelClarityStrength,
  liquidityRiskStrength,
  marketStrength,
  overextensionStrength,
  resistanceSpaceStrength,
  retestStrength,
  rrQualityStrength,
  strengthToScore100,
  volumeStrength,
} from "../factors/strength";
import { clamp, roundTo } from "../math";

function blendStrength(weightedSum: number, weightTotal: number): number {
  if (weightTotal <= 0) return 0;
  return weightedSum / weightTotal;
}

export function buildBaseContextLayers(
  input: EngineTradeInput,
  cfg: EngineConfig,
  layerWeights: EngineConfig["layerWeights"],
): LayerScore[] {
  const m = marketStrength(input.market);
  const mw = cfg.market;
  const marketFactors: FactorBreakdownRow[] = [
    factorRow("market", "btc_trend", mw.btc, m.btc, { btcTrend: input.market.btcTrend }),
    factorRow("market", "alt_trend", mw.alt, m.alt, { altTrend: input.market.altTrend }),
    factorRow("market", "narrative", mw.narrative, m.narrative, {
      narrative: input.market.narrative,
    }),
  ];
  const marketBlend = blendStrength(
    m.btc * mw.btc + m.alt * mw.alt + m.narrative * mw.narrative,
    mw.btc + mw.alt + mw.narrative,
  );
  const market100 = strengthToScore100(marketBlend);

  const sw = cfg.structure;
  const rs = retestStrength(input.structure.retestConfirmation);
  const ls = levelClarityStrength(input.structure.srClarity);
  const hs = htfStrength(input.structure.htfAlignment);
  const structureFactors: FactorBreakdownRow[] = [
    factorRow("structure", "retest_quality", sw.retest, rs, {
      retestConfirmation: input.structure.retestConfirmation,
    }),
    factorRow("structure", "level_clarity", sw.levelClarity, ls, { srClarity: input.structure.srClarity }),
    factorRow("structure", "htf_alignment", sw.htf, hs, { htfAlignment: input.structure.htfAlignment }),
  ];
  const structureBlend = blendStrength(
    rs * sw.retest + ls * sw.levelClarity + hs * sw.htf,
    sw.retest + sw.levelClarity + sw.htf,
  );
  const structure100 = strengthToScore100(structureBlend);

  const momw = cfg.momentum;
  const vs = volumeStrength(input.momentum.relVolume);
  const cs = candleStrength(input.momentum.candleStrength);
  const fs = followThroughStrength(input.momentum.expansionVelocity);
  const momentumFactors: FactorBreakdownRow[] = [
    factorRow("momentum", "volume_strength", momw.volume, vs, { relVolume: input.momentum.relVolume }),
    factorRow("momentum", "candle_impulse", momw.candle, cs, {
      candleStrength: input.momentum.candleStrength,
    }),
    factorRow("momentum", "follow_through", momw.followThrough, fs, {
      expansionVelocity: input.momentum.expansionVelocity,
    }),
  ];
  const momentumBlend = blendStrength(
    vs * momw.volume + cs * momw.candle + fs * momw.followThrough,
    momw.volume + momw.candle + momw.followThrough,
  );
  const momentum100 = strengthToScore100(momentumBlend);

  const ew = cfg.entry;
  const ed = entryDistanceStrength(input.entry.entryEfficiency);
  const rd = resistanceSpaceStrength(input.entry.distanceToResistance);
  const rq = rrQualityStrength(input.entry.rrQuality);
  const entryFactors: FactorBreakdownRow[] = [
    factorRow("entry", "entry_distance", ew.entryDistance, ed, {
      entryEfficiency: input.entry.entryEfficiency,
    }),
    factorRow("entry", "resistance_space", ew.resistanceSpace, rd, {
      distanceToResistance: input.entry.distanceToResistance,
    }),
    factorRow("entry", "rr_quality", ew.rrQuality, rq, {
      rrQuality: input.entry.rrQuality,
      rrNumeric: input.entry.rrNumeric,
    }),
  ];
  const entryBlend = blendStrength(
    ed * ew.entryDistance + rd * ew.resistanceSpace + rq * ew.rrQuality,
    ew.entryDistance + ew.resistanceSpace + ew.rrQuality,
  );
  const entry100 = strengthToScore100(entryBlend);

  const rw = cfg.risk;
  const ox = overextensionStrength(input.risk.overextension);
  const ev = eventRiskStrength(input.risk.eventRisk);
  const lq = liquidityRiskStrength(input.risk.liquidityRisk);
  const riskFactors: FactorBreakdownRow[] = [
    factorRow("risk", "overextension", rw.overextension, ox, {
      overextension: input.risk.overextension,
    }),
    factorRow("risk", "event_risk", rw.eventRisk, ev, { eventRisk: input.risk.eventRisk }),
    factorRow("risk", "liquidity_risk", rw.liquidityRisk, lq, {
      liquidityRisk: input.risk.liquidityRisk,
    }),
  ];
  const riskBlend = blendStrength(
    ox * rw.overextension + ev * rw.eventRisk + lq * rw.liquidityRisk,
    rw.overextension + rw.eventRisk + rw.liquidityRisk,
  );
  const risk100 = strengthToScore100(riskBlend);

  const mkLayer = (
    layer: LayerScore["layer"],
    scoreBlend: number,
    score100: number,
    factors: FactorBreakdownRow[],
    lw: number,
  ): LayerScore => ({
    layer,
    score: roundTo(scoreBlend, 4),
    score100: roundTo(score100, 2),
    layerWeight: lw,
    weighted: roundTo(score100 * lw, 4),
    factors,
  });

  return [
    mkLayer("structure", structureBlend, structure100, structureFactors, layerWeights.structure),
    mkLayer("market", marketBlend, market100, marketFactors, layerWeights.market),
    mkLayer("momentum", momentumBlend, momentum100, momentumFactors, layerWeights.momentum),
    mkLayer("entry", entryBlend, entry100, entryFactors, layerWeights.entry),
    mkLayer("risk", riskBlend, risk100, riskFactors, layerWeights.risk),
  ];
}

function factorRow(
  layer: FactorBreakdownRow["layer"],
  factorKey: string,
  weightInLayer: number,
  rawStrength: number,
  inputSnapshot: Record<string, unknown>,
): FactorBreakdownRow {
  return {
    layer,
    factorKey,
    weightInLayer,
    rawScore: rawStrength,
    weightedContribution: rawStrength * weightInLayer,
    inputSnapshot,
  };
}

export function weightedFinalScore(layers: LayerScore[]): number {
  let s = 0;
  for (const l of layers) {
    s += l.score100 * l.layerWeight;
  }
  return roundTo(clamp(s, 0, 100), 2);
}

export function normalizeLayerWeights(w: EngineConfig["layerWeights"]): EngineConfig["layerWeights"] {
  const t = w.structure + w.market + w.momentum + w.entry + w.risk;
  if (t <= 0) return w;
  return {
    structure: w.structure / t,
    market: w.market / t,
    momentum: w.momentum / t,
    entry: w.entry / t,
    risk: w.risk / t,
  };
}

export function applyMomentumWeightBoost(
  w: EngineConfig["layerWeights"],
  boost: number,
): EngineConfig["layerWeights"] {
  const next = { ...w, momentum: w.momentum * boost };
  return normalizeLayerWeights(next);
}

export function refreshLayerWeighted(layers: LayerScore[], weights: EngineConfig["layerWeights"]): LayerScore[] {
  const n = normalizeLayerWeights(weights);
  return layers.map((l) => ({
    ...l,
    layerWeight: n[l.layer],
    weighted: roundTo(l.score100 * n[l.layer], 4),
  }));
}
