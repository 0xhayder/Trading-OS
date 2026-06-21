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
    w.push(`Rejected: score ${normalizedScore.toFixed(1)} is below the ${classificationToDisplayName(classification)} threshold.`);
  } else if (classification === "watchlist_only") {
    w.push("Watchlist only: wait for better confirmation.");
  }

  if (input.market.btcTrend.startsWith("bear")) {
    w.push("BTC structure is bearish.");
  }

  if (input.observableMarket?.btcVolatilityState === "violent") {
    w.push("BTC volatility is violent.");
  }

  if (input.structure.htfAlignment === "conflict") {
    w.push("Token structure alignment is conflicted across higher, mid, and lower timeframes.");
  }

  if (input.structure.retestConfirmation === "none") {
    w.push("No usable confirmation from the current token structure inputs.");
  }

  if (input.momentum.relVolume === "below_average") {
    w.push("Relative volume is weak.");
  }

  if (input.entry.rrNumeric < 2) {
    w.push("RR is below 2R.");
  }

  if (input.entry.rrNumeric < impliedMinRr) {
    w.push(`RR ${input.entry.rrNumeric.toFixed(2)} is below the size floor ${impliedMinRr.toFixed(2)}.`);
  }

  if (input.risk.overextension === "euphoric") {
    w.push("Overextension is euphoric.");
  }

  if (input.risk.liquidityRisk === "dangerous") {
    w.push("Liquidity is dangerous.");
  }

  if (input.risk.eventRisk === "high") {
    w.push("Event risk is high.");
  }

  return w;
}
