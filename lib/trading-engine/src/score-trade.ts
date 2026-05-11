import { mergeEngineConfig, DEFAULT_ENGINE_CONFIG } from "./config";
import { classifyScore } from "./core/classify";
import { buildAllocationPlan, rrFromExecution } from "./core/allocate";
import { buildWarnings } from "./core/warnings";
import { scoreEntryLayer } from "./layers/entry";
import { scoreMarketLayer } from "./layers/market";
import { scoreMomentumLayer } from "./layers/momentum";
import { scoreRiskLayer } from "./layers/risk";
import { scoreStructureLayer } from "./layers/structure";
import { normalizeBlendTo100, roundTo } from "./math";
import type {
  EngineConfig,
  EngineScoreResult,
  EngineTradeInput,
  UserRiskSettings,
} from "./types";

const ENGINE_VERSION = "2.0.0";

export function scoreEngineTrade(
  input: EngineTradeInput,
  user: UserRiskSettings,
): EngineScoreResult {
  const cfg = mergeEngineConfig(DEFAULT_ENGINE_CONFIG, user.factorConfig);

  const market = scoreMarketLayer(input.market, cfg);
  const structure = scoreStructureLayer(input.structure, cfg);
  const momentum = scoreMomentumLayer(input.momentum, cfg);
  const entry = scoreEntryLayer(input.entry, cfg);
  const risk = scoreRiskLayer(input.risk, cfg);

  const layers = [market, structure, momentum, entry, risk];
  const combinedRaw = roundTo(layers.reduce((s, l) => s + l.weighted, 0), 6);
  const normalizedScore = normalizeBlendTo100(combinedRaw);
  const classification = classifyScore(normalizedScore, cfg);

  const rrExec = rrFromExecution(input.execution);
  const expectedRr = roundTo(rrExec ?? input.entry.rrNumeric, 3);

  const allocation = buildAllocationPlan(classification, cfg, {
    rrNumeric: input.entry.rrNumeric,
    layers,
    maxSinglePositionPct: user.maxSinglePositionPct,
  });

  const warnings = buildWarnings(
    input,
    classification,
    normalizedScore,
    allocation.impliedMinRr,
  );

  const deployable =
    classification === "balanced_trade" ||
    classification === "aggressive_trade" ||
    classification === "asymmetric_swing_trade";

  const rrOk = input.entry.rrNumeric >= allocation.impliedMinRr * 0.85;
  const approved = deployable;

  const reason = !deployable
    ? classification === "reject"
      ? "Formal rejection band — no deployment."
      : "Watchlist / observation — no capital commitment until score improves."
    : rrOk
      ? "Meets minimum asymmetry and regime checks for scaled deployment."
      : "Deployable setup with RR below ideal floor — trade is approved, but reduce size or wait for better location.";

  const factorRows = layers.flatMap((l) => l.factors);

  return {
    engineVersion: ENGINE_VERSION,
    normalizedScore,
    combinedRaw,
    classification,
    layers,
    allocation,
    expectedRr,
    rrFromExecution: rrExec,
    warnings,
    approval: { approved, reason },
    factorRows,
  };
}

export function resolveConfig(user?: Partial<UserRiskSettings>): EngineConfig {
  return mergeEngineConfig(DEFAULT_ENGINE_CONFIG, user?.factorConfig);
}
