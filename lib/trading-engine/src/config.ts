import type { EngineConfig } from "./types";

export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  layerWeights: {
    market: 0.25,
    structure: 0.3,
    momentum: 0.2,
    entry: 0.15,
    risk: 0.1,
  },
  market: {
    btc: 0.4,
    alt: 0.35,
    narrative: 0.25,
  },
  structure: {
    setup: 0.2,
    sr: 0.25,
    retest: 0.25,
    htf: 0.2,
    liquidity: 0.1,
  },
  momentum: {
    volMcap: 0.35,
    relVol: 0.3,
    candle: 0.2,
    velocity: 0.15,
  },
  entry: {
    rr: 0.35,
    entryEff: 0.3,
    resistance: 0.2,
    sl: 0.15,
  },
  risk: {
    vol: 0.35,
    concentration: 0.35,
    correlation: 0.3,
  },
  classificationThresholds: {
    rejectBelow: 45,
    watchlistMax: 60,
    balancedMax: 75,
    aggressiveMax: 85,
  },
  allocationBands: {
    balanced_trade: { min: 30, max: 40 },
    aggressive_trade: { min: 40, max: 55 },
    asymmetric_swing_trade: { min: 55, max: 70 },
  },
};

export function mergeEngineConfig(
  base: EngineConfig,
  patch?: Partial<EngineConfig>,
): EngineConfig {
  if (!patch) return base;
  return {
    ...base,
    ...patch,
    layerWeights: { ...base.layerWeights, ...patch.layerWeights },
    market: { ...base.market, ...patch.market },
    structure: { ...base.structure, ...patch.structure },
    momentum: { ...base.momentum, ...patch.momentum },
    entry: { ...base.entry, ...patch.entry },
    risk: { ...base.risk, ...patch.risk },
    classificationThresholds: {
      ...base.classificationThresholds,
      ...patch.classificationThresholds,
    },
    allocationBands: {
      ...base.allocationBands,
      ...patch.allocationBands,
    },
  };
}
