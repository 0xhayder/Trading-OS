import { mergeEngineConfig, DEFAULT_ENGINE_CONFIG } from "./config";
import { rrFromExecution } from "./core/allocate";
import { buildWarnings } from "./core/warnings";
import { normalizeLayerWeights, buildBaseContextLayers, weightedFinalScore } from "./pipeline/base-layers";
import { runHardFilterEngine } from "./pipeline/hard-filters";
import { applyConditionalAndSynergy } from "./pipeline/modifiers";
import { runRiskCompressionEngine } from "./pipeline/risk-compression";
import { classifyFromScore, confidenceStability, aggressionFromClassification } from "./pipeline/classify-final";
import { buildNonlinearAllocation } from "./pipeline/allocation-engine";
import { runRrEngine } from "./pipeline/rr-engine";
import { roundTo } from "./math";
import type {
  EngineConfig,
  EngineScoreResult,
  EngineTradeInput,
  UserRiskSettings,
} from "./types";

const ENGINE_VERSION = "3.0.0";

function combinedRawFrom100(score: number): number {
  return roundTo((score / 100) * 2 - 1, 6);
}

function buildReasoningSummary(params: {
  hardRejected: boolean;
  classification: EngineScoreResult["classification"];
  finalScore: number;
  mod: import("./pipeline/modifiers").ModifierState;
  compression: import("./pipeline/risk-compression").RiskCompressionResult;
  classNotes: string[];
}): string {
  const parts: string[] = [];
  if (params.hardRejected) {
    parts.push("Hard filter veto — trade blocked before conditional scoring.");
    return parts.join(" ");
  }
  parts.push(`Final score ${params.finalScore} → ${params.classification.replace(/_/g, " ")}.`);
  if (params.mod.conditionalTrace.length) {
    parts.push(`Conditionals: ${params.mod.conditionalTrace.join(" ")}`);
  }
  if (params.mod.positiveSynergies.length) {
    parts.push(`Positive synergies: ${params.mod.positiveSynergies.join(", ")}.`);
  }
  if (params.mod.negativeSynergies.length) {
    parts.push(`Negative synergies: ${params.mod.negativeSynergies.join(", ")}.`);
  }
  if (params.compression.traces.length) {
    parts.push(`Risk compression: ${params.compression.traces.join(" ")}`);
  }
  if (params.classNotes.length) {
    parts.push(`Classification notes: ${params.classNotes.join(" ")}`);
  }
  return parts.join(" ");
}

export function scoreEngineTrade(input: EngineTradeInput, user: UserRiskSettings): EngineScoreResult {
  const cfg = mergeEngineConfig(DEFAULT_ENGINE_CONFIG, user.factorConfig);
  const lw0 = normalizeLayerWeights(cfg.layerWeights);
  const hard = runHardFilterEngine(input);
  const baseLayers = buildBaseContextLayers(input, cfg, lw0);
  const baseFinal = weightedFinalScore(baseLayers);

  if (hard.rejected) {
    const normalizedScore = roundTo(baseFinal, 2);
    const combinedRaw = combinedRawFrom100(normalizedScore);
    const classification = "reject" as const;
    const allocation = buildNonlinearAllocation(classification, cfg, {
      input,
      layers: baseLayers,
      maxSinglePositionPct: user.maxSinglePositionPct,
      finalScore: normalizedScore,
      compression: {
        allocationCoefficient: 1,
        aggressionDowngradeSteps: 0,
        rrTighten: false,
        tpExtensionBlocked: true,
        traces: [],
      },
      negativeAllocationMultiplier: 1,
    });
    const rrEngine = runRrEngine(
      input,
      classification,
      {
        layers: baseLayers,
        layerWeights: lw0,
        finalScore: normalizedScore,
        conditionalTrace: [],
        positiveSynergies: [],
        negativeSynergies: [],
        expansionEligibleFromSynergy: false,
        rrAggressionBoost: 0,
        allocationCeilingMultiplier: 1,
      },
      {
        allocationCoefficient: 1,
        aggressionDowngradeSteps: 0,
        rrTighten: true,
        tpExtensionBlocked: true,
        traces: [],
      },
    );
    const warnings = buildWarnings(input, classification, normalizedScore, allocation.impliedMinRr);
    warnings.push(...hard.traces.map((t) => `${t.ruleId}: ${t.detail}`));
    const factorRows = baseLayers.flatMap((l) => l.factors);
    const layerScores100 = Object.fromEntries(baseLayers.map((l) => [l.layer, l.score100])) as EngineScoreResult["layerScores100"];

    return {
      engineVersion: ENGINE_VERSION,
      normalizedScore,
      combinedRaw,
      classification,
      layers: baseLayers,
      allocation,
      expectedRr: roundTo(rrFromExecution(input.execution) ?? input.entry.rrNumeric, 3),
      rrFromExecution: rrFromExecution(input.execution),
      rrEngine,
      warnings,
      approval: {
        approved: false,
        reason: hard.traces.map((t) => t.detail).join(" "),
      },
      factorRows,
      layerScores100,
      activeSynergies: [],
      activePenalties: [],
      aggressionLevel: "none",
      confidenceStability: confidenceStability(baseLayers, normalizedScore),
      reasoningSummary: buildReasoningSummary({
        hardRejected: true,
        classification,
        finalScore: normalizedScore,
        mod: {
          layers: baseLayers,
          layerWeights: lw0,
          finalScore: normalizedScore,
          conditionalTrace: [],
          positiveSynergies: [],
          negativeSynergies: [],
          expansionEligibleFromSynergy: false,
          rrAggressionBoost: 0,
          allocationCeilingMultiplier: 1,
        },
        compression: {
          allocationCoefficient: 1,
          aggressionDowngradeSteps: 0,
          rrTighten: false,
          tpExtensionBlocked: true,
          traces: [],
        },
        classNotes: [],
      }),
      diagnostics: {
        hardFilters: hard.traces,
        conditionalRules: [],
        positiveSynergies: [],
        negativeSynergies: [],
        riskCompression: [],
        classificationDowngradeReasons: [],
        hiddenBlendFingerprint: roundTo(combinedRaw * 1_000_000 + normalizedScore, 0),
      },
    };
  }

  const mod = applyConditionalAndSynergy(input, cfg, baseLayers);
  const compression = runRiskCompressionEngine(input, mod.finalScore, mod.layers);
  const classRes = classifyFromScore(
    mod.finalScore,
    cfg,
    hard,
    mod,
    mod.layers,
    compression.aggressionDowngradeSteps,
  );
  let classification = classRes.classification;

  const allocation = buildNonlinearAllocation(classification, cfg, {
    input,
    layers: mod.layers,
    maxSinglePositionPct: user.maxSinglePositionPct,
    finalScore: mod.finalScore,
    compression,
    negativeAllocationMultiplier: mod.allocationCeilingMultiplier,
  });

  const rrEngine = runRrEngine(input, classification, mod, compression);

  const impliedMinRr = allocation.impliedMinRr;
  const warnings = buildWarnings(input, classification, mod.finalScore, impliedMinRr);
  warnings.push(...hard.traces.filter((t) => t.action !== "pass").map((t) => `${t.ruleId}: ${t.detail}`));
  warnings.push(...compression.traces);
  warnings.push(...classRes.downgradeReasons);

  const deployable =
    classification === "standard_trade" ||
    classification === "high_conviction_trade" ||
    classification === "expansion_trade";
  const rrOk = input.entry.rrNumeric >= impliedMinRr * 0.85;
  const approved = deployable;

  const reason = !deployable
    ? classification === "reject"
      ? "Formal rejection band — no deployment."
      : "Watchlist / observation — no capital commitment until score improves."
    : rrOk
      ? "Meets minimum asymmetry and regime checks for scaled deployment."
      : "Deployable setup with RR below ideal floor — trade is approved, but reduce size or wait for better location.";

  const factorRows = mod.layers.flatMap((l) => l.factors);
  const layerScores100 = Object.fromEntries(mod.layers.map((l) => [l.layer, l.score100])) as EngineScoreResult["layerScores100"];

  const aggressionLevel = aggressionFromClassification(classification, hard.aggressionCeiling);

  return {
    engineVersion: ENGINE_VERSION,
    normalizedScore: mod.finalScore,
    combinedRaw: combinedRawFrom100(mod.finalScore),
    classification,
    layers: mod.layers,
    allocation,
    expectedRr: roundTo(rrFromExecution(input.execution) ?? input.entry.rrNumeric, 3),
    rrFromExecution: rrFromExecution(input.execution),
    rrEngine,
    warnings,
    approval: { approved, reason },
    factorRows,
    layerScores100,
    activeSynergies: mod.positiveSynergies,
    activePenalties: mod.negativeSynergies,
    aggressionLevel,
    confidenceStability: confidenceStability(mod.layers, mod.finalScore),
    reasoningSummary: buildReasoningSummary({
      hardRejected: false,
      classification,
      finalScore: mod.finalScore,
      mod,
      compression,
      classNotes: classRes.downgradeReasons,
    }),
    diagnostics: {
      hardFilters: hard.traces,
      conditionalRules: mod.conditionalTrace,
      positiveSynergies: mod.positiveSynergies,
      negativeSynergies: mod.negativeSynergies,
      riskCompression: compression.traces,
      classificationDowngradeReasons: classRes.downgradeReasons,
      hiddenBlendFingerprint: roundTo(combinedRawFrom100(mod.finalScore) * 1_000_000 + mod.finalScore, 0),
    },
  };
}

export function resolveConfig(user?: Partial<UserRiskSettings>): EngineConfig {
  return mergeEngineConfig(DEFAULT_ENGINE_CONFIG, user?.factorConfig);
}
