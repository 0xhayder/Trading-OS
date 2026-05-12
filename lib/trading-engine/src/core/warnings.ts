import type { EngineTradeInput, TradeClassification } from "../types";
import { classificationToDisplayName } from "./classify";

export function buildWarnings(
  input: EngineTradeInput,
  classification: TradeClassification,
  normalizedScore: number,
  impliedMinRr: number,
): string[] {
  const w: string[] = [];

  if (classification === "reject") {
    w.push(
      `Score ${normalizedScore.toFixed(1)} below institutional minimum — ${classificationToDisplayName(classification)}.`,
    );
  } else if (classification === "watchlist_only") {
    w.push("Observation mode only — wait for structure or momentum confirmation.");
  }

  if (input.market.btcTrend.startsWith("bear")) {
    w.push("BTC regime bearish — alt-beta drag likely.");
  }

  if (input.structure.htfAlignment === "conflict") {
    w.push("HTF conflict — probability tax until alignment returns.");
  }

  if (input.structure.retestConfirmation === "none") {
    w.push("No retest confirmation — execution risk elevated.");
  }

  if (input.momentum.relVolume === "below_average") {
    w.push("Relative volume weak — lack of sponsorship.");
  }

  if (input.entry.rrNumeric < 2) {
    w.push("RR below 2R — structurally poor asymmetry.");
  }

  if (input.entry.rrNumeric < impliedMinRr) {
    w.push(
      `RR ${input.entry.rrNumeric.toFixed(2)} under size-implied floor ${impliedMinRr.toFixed(2)} — reduce allocation or wait for better location.`,
    );
  }

  if (input.risk.overextension === "euphoric") {
    w.push("Euphoric extension — compression on momentum and sizing active.");
  }

  if (input.risk.liquidityRisk === "dangerous") {
    w.push("Liquidity cluster risk — slippage / stop-hunt exposure elevated.");
  }

  if (input.risk.eventRisk === "high") {
    w.push("High scheduled / headline event risk — prefer reduced size or sidelines.");
  }

  return w;
}
