import { clamp, minRrForAllocation, roundTo } from "../math";
import type {
  AllocationPlan,
  EngineConfig,
  EngineTradeInput,
  LayerScore,
  TradeClassification,
} from "../types";
import type { RiskCompressionResult } from "./risk-compression";

function nonlinearTarget(min: number, max: number, t: number): number {
  const curve = Math.pow(clamp(t, 0, 1), 1.35);
  return min + (max - min) * curve;
}

export function buildNonlinearAllocation(
  classification: TradeClassification,
  cfg: EngineConfig,
  ctx: {
    input: EngineTradeInput;
    layers: LayerScore[];
    maxSinglePositionPct: number;
    finalScore: number;
    compression: RiskCompressionResult;
    negativeAllocationMultiplier: number;
  },
): AllocationPlan {
  const adjustments: string[] = [];

  if (classification === "reject" || classification === "watchlist_only") {
    return {
      minPct: 0,
      maxPct: 0,
      targetPct: 0,
      impliedMinRr: minRrForAllocation(15),
      adjustments: ["No deployment for reject / watchlist classifications."],
      curveId: "zero_band",
    };
  }

  const band = cfg.allocationBands[classification];
  const scoreT = clamp((ctx.finalScore - 45) / 55, 0, 1);
  let target = nonlinearTarget(band.min, band.max, scoreT);

  const structure = ctx.layers.find((l) => l.layer === "structure")?.score100 ?? 0;
  const momentum = ctx.layers.find((l) => l.layer === "momentum")?.score100 ?? 0;

  const structureGovernance =
    structure < 55 ? 0.55 : structure < 70 ? 0.72 : structure < 80 ? 0.88 : 1;
  target *= structureGovernance;
  if (structureGovernance < 1) {
    adjustments.push("Structure quality capped maximum aggression vs raw momentum.");
  }

  if (momentum > 80 && structure < 70) {
    target *= 0.82;
    adjustments.push("Isolated momentum without structure depth — sizing haircut.");
  }

  target *= ctx.compression.allocationCoefficient;
  if (ctx.compression.allocationCoefficient < 1) {
    adjustments.push("Risk compression coefficient applied to allocation.");
  }

  target *= ctx.negativeAllocationMultiplier;
  if (ctx.negativeAllocationMultiplier < 1) {
    adjustments.push("Negative synergy reduced allocation ceiling.");
  }

  const impliedMinRr = minRrForAllocation(clamp(target, 15, 50));
  if (ctx.input.entry.rrNumeric < impliedMinRr) {
    const ratio = clamp(ctx.input.entry.rrNumeric / impliedMinRr, 0.35, 1);
    target *= ratio;
    adjustments.push(
      `RR ${roundTo(ctx.input.entry.rrNumeric, 2)} below implied floor ${impliedMinRr} — scaled ${roundTo(ratio, 2)}×.`,
    );
  }

  const hardCap = clamp(ctx.maxSinglePositionPct, 5, 100);
  target = clamp(target, band.min * 0.5, Math.min(band.max, hardCap));

  return {
    minPct: roundTo(band.min, 2),
    maxPct: roundTo(Math.min(band.max, hardCap), 2),
    targetPct: roundTo(target, 2),
    impliedMinRr,
    adjustments,
    curveId: "nonlinear_power_1.35",
  };
}
