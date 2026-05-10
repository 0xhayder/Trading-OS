import type { EngineConfig, EngineTradeInput, FactorBreakdownRow, LayerScore } from "../types";

function scoreRr(rr: number): number {
  if (rr > 5) return 1;
  if (rr >= 3) return 0.7;
  if (rr >= 2) return 0.3;
  return -0.7;
}

const ENTRY_EFF: Record<EngineTradeInput["entry"]["entryEfficiency"], number> = {
  perfect: 1,
  decent: 0.5,
  chased: -0.7,
};

const RES: Record<EngineTradeInput["entry"]["distanceToResistance"], number> = {
  large: 1,
  decent: 0.5,
  nearby: -0.7,
};

const SL: Record<EngineTradeInput["entry"]["slEfficiency"], number> = {
  structural: 1,
  acceptable: 0.5,
  poor: -0.5,
};

export function scoreEntryLayer(
  input: EngineTradeInput["entry"],
  cfg: EngineConfig,
): LayerScore {
  const w = cfg.entry;
  const rr = scoreRr(input.rrNumeric);
  const ent = ENTRY_EFF[input.entryEfficiency];
  const res = RES[input.distanceToResistance];
  const sl = SL[input.slEfficiency];

  const factors: FactorBreakdownRow[] = [
    {
      layer: "entry",
      factorKey: "rr_quality",
      weightInLayer: w.rr,
      rawScore: rr,
      weightedContribution: rr * w.rr,
      inputSnapshot: { rrNumeric: input.rrNumeric },
    },
    {
      layer: "entry",
      factorKey: "entry_efficiency",
      weightInLayer: w.entryEff,
      rawScore: ent,
      weightedContribution: ent * w.entryEff,
      inputSnapshot: { entryEfficiency: input.entryEfficiency },
    },
    {
      layer: "entry",
      factorKey: "distance_to_resistance",
      weightInLayer: w.resistance,
      rawScore: res,
      weightedContribution: res * w.resistance,
      inputSnapshot: { distanceToResistance: input.distanceToResistance },
    },
    {
      layer: "entry",
      factorKey: "sl_efficiency",
      weightInLayer: w.sl,
      rawScore: sl,
      weightedContribution: sl * w.sl,
      inputSnapshot: { slEfficiency: input.slEfficiency },
    },
  ];

  const score = factors.reduce((s, f) => s + f.weightedContribution, 0);
  return {
    layer: "entry",
    score,
    layerWeight: cfg.layerWeights.entry,
    weighted: score * cfg.layerWeights.entry,
    factors,
  };
}
