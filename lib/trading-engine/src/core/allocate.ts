import { clamp, minRrForAllocation, roundTo } from "../math";
import type {
  AllocationPlan,
  EngineConfig,
  EngineTradeInput,
  LayerScore,
  TradeClassification,
} from "../types";

function bandMid(min: number, max: number): number {
  return (min + max) / 2;
}

export function buildAllocationPlan(
  classification: TradeClassification,
  cfg: EngineConfig,
  ctx: {
    rrNumeric: number;
    layers: LayerScore[];
    maxSinglePositionPct: number;
  },
): AllocationPlan {
  const adjustments: string[] = [];

  if (classification === "reject" || classification === "watchlist_only") {
    return {
      minPct: 0,
      maxPct: 0,
      targetPct: 0,
      impliedMinRr: minRrForAllocation(15),
      adjustments: ["No capital deployment for rejected / watchlist-only classifications."],
    };
  }

  const band = cfg.allocationBands[classification];
  let target = bandMid(band.min, band.max);

  const market = ctx.layers.find((l) => l.layer === "market")?.score ?? 0;
  const structure = ctx.layers.find((l) => l.layer === "structure")?.score ?? 0;
  const risk = ctx.layers.find((l) => l.layer === "risk")?.score ?? 0;

  if (risk < 0) {
    const f = 1 + risk * 0.15;
    target *= f;
    adjustments.push(`Risk layer drag applied (${roundTo(f, 3)}×).`);
  }

  if (market < 0) {
    target *= 0.92;
    adjustments.push("Market headwind: −8% sizing.");
  }

  if (structure < 0.25) {
    target *= 0.9;
    adjustments.push("Structure quality soft: −10% sizing.");
  }

  const impliedMinRr = minRrForAllocation(target);
  if (ctx.rrNumeric < impliedMinRr) {
    const ratio = clamp(ctx.rrNumeric / impliedMinRr, 0.35, 1);
    target *= ratio;
    adjustments.push(
      `RR ${roundTo(ctx.rrNumeric, 2)} below implied minimum ${impliedMinRr} for size — scaled by ${roundTo(ratio, 2)}×.`,
    );
  }

  target = clamp(target, band.min * 0.65, band.max);
  const hardCap = clamp(ctx.maxSinglePositionPct, 5, 100);
  target = Math.min(target, hardCap);

  return {
    minPct: roundTo(band.min, 2),
    maxPct: roundTo(Math.min(band.max, hardCap), 2),
    targetPct: roundTo(target, 2),
    impliedMinRr,
    adjustments,
  };
}

export function rrFromExecution(exec: EngineTradeInput["execution"]): number | undefined {
  if (!exec) return undefined;
  const sl = exec.stopLossPct;
  if (!(sl > 0)) return undefined;
  const rr1 = exec.tp1Pct / sl;
  const rr2 = exec.tp2Pct / sl;
  return roundTo((rr1 + rr2) / 2, 3);
}
