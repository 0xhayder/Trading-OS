import type { EngineConfig, EngineTradeInput, FactorBreakdownRow, LayerScore } from "../types";

const TREND: Record<EngineTradeInput["market"]["btcTrend"], number> = {
  strong_bullish: 1,
  bullish: 0.5,
  neutral: 0,
  bearish: -0.5,
  strong_bearish: -1,
};

const NARRATIVE: Record<EngineTradeInput["market"]["narrative"], number> = {
  hot: 1,
  active: 0.5,
  neutral: 0,
  weak: -0.5,
  dead: -1,
};

export function scoreMarketLayer(
  input: EngineTradeInput["market"],
  cfg: EngineConfig,
): LayerScore {
  const w = cfg.market;
  const btc = TREND[input.btcTrend];
  const alt = TREND[input.altTrend];
  const narrative = NARRATIVE[input.narrative];

  const factors: FactorBreakdownRow[] = [
    {
      layer: "market",
      factorKey: "btc_trend",
      weightInLayer: w.btc,
      rawScore: btc,
      weightedContribution: btc * w.btc,
      inputSnapshot: { btcTrend: input.btcTrend },
    },
    {
      layer: "market",
      factorKey: "alt_trend",
      weightInLayer: w.alt,
      rawScore: alt,
      weightedContribution: alt * w.alt,
      inputSnapshot: { altTrend: input.altTrend },
    },
    {
      layer: "market",
      factorKey: "narrative_sector",
      weightInLayer: w.narrative,
      rawScore: narrative,
      weightedContribution: narrative * w.narrative,
      inputSnapshot: { narrative: input.narrative },
    },
  ];

  const score = factors.reduce((s, f) => s + f.weightedContribution, 0);
  return {
    layer: "market",
    score,
    layerWeight: cfg.layerWeights.market,
    weighted: score * cfg.layerWeights.market,
    factors,
  };
}
