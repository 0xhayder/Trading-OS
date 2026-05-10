import type { EngineConfig, EngineTradeInput, FactorBreakdownRow, LayerScore } from "../types";

/** Elevated / high risk regimes drag the layer negative to reduce sizing appetite. */
function severityScore(s: EngineTradeInput["risk"]["marketVolatility"]): number {
  switch (s) {
    case "low":
      return 1;
    case "elevated":
      return 0;
    case "high":
      return -1;
    default:
      return 0;
  }
}

export function scoreRiskLayer(
  input: EngineTradeInput["risk"],
  cfg: EngineConfig,
): LayerScore {
  const w = cfg.risk;
  const v = severityScore(input.marketVolatility);
  const c = severityScore(input.positionConcentration);
  const x = severityScore(input.correlationExposure);

  const factors: FactorBreakdownRow[] = [
    {
      layer: "risk",
      factorKey: "market_volatility",
      weightInLayer: w.vol,
      rawScore: v,
      weightedContribution: v * w.vol,
      inputSnapshot: { marketVolatility: input.marketVolatility },
    },
    {
      layer: "risk",
      factorKey: "position_concentration",
      weightInLayer: w.concentration,
      rawScore: c,
      weightedContribution: c * w.concentration,
      inputSnapshot: { positionConcentration: input.positionConcentration },
    },
    {
      layer: "risk",
      factorKey: "correlation_exposure",
      weightInLayer: w.correlation,
      rawScore: x,
      weightedContribution: x * w.correlation,
      inputSnapshot: { correlationExposure: input.correlationExposure },
    },
  ];

  const score = factors.reduce((s, f) => s + f.weightedContribution, 0);
  return {
    layer: "risk",
    score,
    layerWeight: cfg.layerWeights.risk,
    weighted: score * cfg.layerWeights.risk,
    factors,
  };
}
