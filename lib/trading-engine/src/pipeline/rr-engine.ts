import type { EngineTradeInput, RrEngineOutput, TradeClassification } from "../types";
import type { ModifierState } from "./modifiers";
import type { RiskCompressionResult } from "./risk-compression";
import { clamp, roundTo } from "../math";

export function runRrEngine(
  input: EngineTradeInput,
  classification: TradeClassification,
  mod: ModifierState,
  compression: RiskCompressionResult,
): RrEngineOutput {
  const notes: string[] = [];
  const structureStrong = mod.layers.find((l) => l.layer === "structure")?.score100 ?? 0;
  const momentumStrong = mod.layers.find((l) => l.layer === "momentum")?.score100 ?? 0;
  const narrativeHot = input.market.narrative === "hot";

  const highQuality =
    structureStrong >= 72 &&
    momentumStrong >= 72 &&
    (narrativeHot || input.market.narrative === "active");

  const lowQuality =
    input.momentum.expansionVelocity === "slow" ||
    input.entry.distanceToResistance === "nearby" ||
    input.market.narrative === "neutral";

  let baseSl = input.execution?.stopLossPct ?? 2.5;
  let tolerance = 1 + mod.rrAggressionBoost;

  if (highQuality) {
    baseSl = clamp(baseSl * 1.15, 1.2, 8);
    tolerance *= 1.1;
    notes.push("High-quality stack: allow wider invalidation, ladder TPs, optional runner.");
  } else if (lowQuality) {
    baseSl = clamp(baseSl * 0.85, 0.8, 5);
    tolerance *= 0.85;
    notes.push("Low-quality / neutral tape: prefer tighter SL and faster TP harvest.");
  }

  if (compression.rrTighten) {
    baseSl = clamp(baseSl * 0.88, 0.8, 6);
    tolerance *= 0.9;
    notes.push("Risk compression: RR expansion disabled, SL tightened.");
  }

  if (classification === "reject" || classification === "watchlist_only") {
    tolerance = 0;
  }

  const runnerAllowed =
    highQuality && !compression.tpExtensionBlocked && classification === "expansion_trade";
  const multiTp =
    highQuality && !compression.tpExtensionBlocked && classification !== "watchlist_only";
  const asymmetric = highQuality && input.entry.rrQuality !== "poor";

  let structure = "";
  if (highQuality && multiTp) {
    structure = "Scaled exits (TP1 / TP2) with optional runner; asymmetric RR preferred.";
  } else if (multiTp) {
    structure = "Dual TP ladder with conservative runner.";
  } else {
    structure = "Single primary TP — prioritize capital return.";
  }

  return {
    suggestedSlPct: roundTo(baseSl, 2),
    suggestedRrStructure: structure,
    runnerAllowed,
    multiTpScaling: multiTp,
    asymmetricRrPreferred: asymmetric,
    rrAggressionTolerance: roundTo(tolerance, 3),
    notes,
  };
}
