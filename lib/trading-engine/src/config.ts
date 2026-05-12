import type { EngineConfig } from "./types";

/** Default weights match the multi-layer specification (admin-editable via merge). */
export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  layerWeights: {
    structure: 0.35,
    market: 0.25,
    momentum: 0.2,
    entry: 0.15,
    risk: 0.05,
  },
  structure: {
    retest: 0.4,
    levelClarity: 0.35,
    htf: 0.25,
  },
  market: {
    btc: 0.45,
    alt: 0.35,
    narrative: 0.2,
  },
  momentum: {
    volume: 0.4,
    candle: 0.35,
    followThrough: 0.25,
  },
  entry: {
    entryDistance: 0.35,
    resistanceSpace: 0.4,
    rrQuality: 0.25,
  },
  risk: {
    overextension: 0.45,
    eventRisk: 0.35,
    liquidityRisk: 0.2,
  },
  classificationThresholds: {
    rejectMax: 44,
    watchlistMax: 59,
    standardMax: 74,
    highConvictionMax: 87,
  },
  allocationBands: {
    standard_trade: { min: 10, max: 18 },
    high_conviction_trade: { min: 20, max: 35 },
    expansion_trade: { min: 35, max: 60 },
  },
};

export function mergeEngineConfig(base: EngineConfig, patch?: Partial<EngineConfig>): EngineConfig {
  if (!patch) return base;
  return {
    ...base,
    ...patch,
    layerWeights: { ...base.layerWeights, ...patch.layerWeights },
    structure: { ...base.structure, ...patch.structure },
    market: { ...base.market, ...patch.market },
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
