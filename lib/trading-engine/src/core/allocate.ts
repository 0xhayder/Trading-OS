import { roundTo } from "../math";
import type { EngineTradeInput } from "../types";

export function rrFromExecution(exec: EngineTradeInput["execution"]): number | undefined {
  if (!exec) return undefined;
  const sl = exec.stopLossPct;
  if (!(sl > 0)) return undefined;
  const legs = [
    { target: exec.tp1Pct, weight: exec.tp1PositionPct },
    { target: exec.tp2Pct, weight: exec.tp2PositionPct },
    { target: exec.tp3Pct ?? 0, weight: exec.tp3PositionPct },
  ].filter((leg) => leg.target > 0);

  if (legs.length === 0) return undefined;

  const explicitWeightTotal = legs.reduce((sum, leg) => sum + (leg.weight ?? 0), 0);
  if (explicitWeightTotal > 0) {
    const weighted = legs.reduce((sum, leg) => {
      const normalizedWeight = (leg.weight ?? 0) / explicitWeightTotal;
      return sum + (leg.target / sl) * normalizedWeight;
    }, 0);
    return roundTo(weighted, 3);
  }

  const unweighted = legs.reduce((sum, leg) => sum + leg.target / sl, 0) / legs.length;
  return roundTo(unweighted, 3);
}
