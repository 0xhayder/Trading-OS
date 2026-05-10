import type { EngineConfig, EngineTradeInput, FactorBreakdownRow, LayerScore } from "../types";

function scoreVolMcap(ratio: number): number {
  if (ratio > 1) return 1;
  if (ratio >= 0.5) return 0.5;
  if (ratio >= 0.2) return 0;
  return -0.5;
}

const REL_VOL: Record<EngineTradeInput["momentum"]["relVolume"], number> = {
  above_2x: 1,
  one_point_five_x: 0.5,
  average: 0,
  below_average: -0.5,
};

const CANDLE: Record<EngineTradeInput["momentum"]["candleStrength"], number> = {
  explosive: 1,
  strong: 0.5,
  weak: -0.3,
};

const VELOCITY: Record<EngineTradeInput["momentum"]["expansionVelocity"], number> = {
  aggressive: 1,
  healthy: 0.5,
  slow: -0.3,
};

export function scoreMomentumLayer(
  input: EngineTradeInput["momentum"],
  cfg: EngineConfig,
): LayerScore {
  const w = cfg.momentum;
  const vm = scoreVolMcap(input.volumeToMcapRatio);
  const rv = REL_VOL[input.relVolume];
  const cd = CANDLE[input.candleStrength];
  const vel = VELOCITY[input.expansionVelocity];

  const factors: FactorBreakdownRow[] = [
    {
      layer: "momentum",
      factorKey: "volume_mcap_ratio",
      weightInLayer: w.volMcap,
      rawScore: vm,
      weightedContribution: vm * w.volMcap,
      inputSnapshot: { volumeToMcapRatio: input.volumeToMcapRatio },
    },
    {
      layer: "momentum",
      factorKey: "relative_volume",
      weightInLayer: w.relVol,
      rawScore: rv,
      weightedContribution: rv * w.relVol,
      inputSnapshot: { relVolume: input.relVolume },
    },
    {
      layer: "momentum",
      factorKey: "momentum_candle",
      weightInLayer: w.candle,
      rawScore: cd,
      weightedContribution: cd * w.candle,
      inputSnapshot: { candleStrength: input.candleStrength },
    },
    {
      layer: "momentum",
      factorKey: "expansion_velocity",
      weightInLayer: w.velocity,
      rawScore: vel,
      weightedContribution: vel * w.velocity,
      inputSnapshot: { expansionVelocity: input.expansionVelocity },
    },
  ];

  const score = factors.reduce((s, f) => s + f.weightedContribution, 0);
  return {
    layer: "momentum",
    score,
    layerWeight: cfg.layerWeights.momentum,
    weighted: score * cfg.layerWeights.momentum,
    factors,
  };
}
