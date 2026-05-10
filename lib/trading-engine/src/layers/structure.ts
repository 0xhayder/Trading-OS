import type { EngineConfig, EngineTradeInput, FactorBreakdownRow, LayerScore, SetupType } from "../types";

const SETUP: Record<SetupType, number> = {
  breakout_retest: 1,
  double_bottom: 0.8,
  trend_continuation: 0.7,
  trendline_reclaim: 0.3,
};

const SR: Record<EngineTradeInput["structure"]["srClarity"], number> = {
  extremely_obvious: 1,
  clean: 0.7,
  medium: 0.3,
  forced: -0.5,
};

const RETEST: Record<EngineTradeInput["structure"]["retestConfirmation"], number> = {
  strong: 1,
  decent: 0.5,
  weak: -0.3,
  none: -1,
};

const HTF: Record<EngineTradeInput["structure"]["htfAlignment"], number> = {
  full: 1,
  partial: 0.5,
  conflict: -0.7,
};

const LIQ: Record<EngineTradeInput["structure"]["liquiditySpace"], number> = {
  major_clean: 1,
  moderate: 0.5,
  heavy_resistance: -0.7,
};

export function scoreStructureLayer(
  input: EngineTradeInput["structure"],
  cfg: EngineConfig,
): LayerScore {
  const w = cfg.structure;
  const setup = SETUP[input.setupType];
  const sr = SR[input.srClarity];
  const retest = RETEST[input.retestConfirmation];
  const htf = HTF[input.htfAlignment];
  const liq = LIQ[input.liquiditySpace];

  const factors: FactorBreakdownRow[] = [
    {
      layer: "structure",
      factorKey: "setup_type",
      weightInLayer: w.setup,
      rawScore: setup,
      weightedContribution: setup * w.setup,
      inputSnapshot: { setupType: input.setupType },
    },
    {
      layer: "structure",
      factorKey: "sr_clarity",
      weightInLayer: w.sr,
      rawScore: sr,
      weightedContribution: sr * w.sr,
      inputSnapshot: { srClarity: input.srClarity },
    },
    {
      layer: "structure",
      factorKey: "retest_confirmation",
      weightInLayer: w.retest,
      rawScore: retest,
      weightedContribution: retest * w.retest,
      inputSnapshot: { retestConfirmation: input.retestConfirmation },
    },
    {
      layer: "structure",
      factorKey: "htf_alignment",
      weightInLayer: w.htf,
      rawScore: htf,
      weightedContribution: htf * w.htf,
      inputSnapshot: { htfAlignment: input.htfAlignment },
    },
    {
      layer: "structure",
      factorKey: "liquidity_space",
      weightInLayer: w.liquidity,
      rawScore: liq,
      weightedContribution: liq * w.liquidity,
      inputSnapshot: { liquiditySpace: input.liquiditySpace },
    },
  ];

  const score = factors.reduce((s, f) => s + f.weightedContribution, 0);
  return {
    layer: "structure",
    score,
    layerWeight: cfg.layerWeights.structure,
    weighted: score * cfg.layerWeights.structure,
    factors,
  };
}
