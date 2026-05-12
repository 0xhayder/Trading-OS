export * from "./types";
export * from "./config";
export * from "./math";
export * from "./score-trade";
export * from "./analytics";
export * from "./schemas";
export * from "./legacy-adapter";
export { classificationToDisplayName } from "./core/classify";
export { rrFromExecution } from "./core/allocate";

/** Modular pipeline stages for backtests, admin tooling, and future ML hooks. */
export { runHardFilterEngine } from "./pipeline/hard-filters";
export type { HardFilterOutcome, AggressionCeiling } from "./pipeline/hard-filters";
export { buildBaseContextLayers, weightedFinalScore, normalizeLayerWeights } from "./pipeline/base-layers";
export { applyConditionalAndSynergy } from "./pipeline/modifiers";
export type { ModifierState } from "./pipeline/modifiers";
export { runRiskCompressionEngine } from "./pipeline/risk-compression";
export { classifyFromScore, downgradeDeployableClass, confidenceStability } from "./pipeline/classify-final";
export { buildNonlinearAllocation } from "./pipeline/allocation-engine";
export { runRrEngine } from "./pipeline/rr-engine";

export { buildDecisionPresentation } from "./presentation/decision-presentation";
export type {
  DecisionPresentation,
  DominantDecisionState,
  PrimaryCtaKind,
  ConflictChip,
  TpLegPresentation,
} from "./presentation/decision-presentation";
