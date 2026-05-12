import { roundTo } from "../math";
import type { EngineTradeInput } from "../types";

export function rrFromExecution(exec: EngineTradeInput["execution"]): number | undefined {
  if (!exec) return undefined;
  const sl = exec.stopLossPct;
  if (!(sl > 0)) return undefined;
  const rr1 = exec.tp1Pct / sl;
  const rr2 = exec.tp2Pct / sl;
  return roundTo((rr1 + rr2) / 2, 3);
}
