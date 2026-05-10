import type { TradeInput, ScoreResult, TradeStatus } from "./types";

function score3(val: string, high: string, mid: string): number {
  if (val === high) return 10;
  if (val === mid) return 5;
  return 0;
}

export function scoreTradeInput(input: Partial<TradeInput>): ScoreResult {
  const market =
    score3(input.btcCondition ?? "", "Bullish", "Neutral") +
    score3(input.altCondition ?? "", "Bullish", "Neutral") +
    score3(input.narrativeStrength ?? "", "Hot", "Active");

  const structure =
    score3(input.levelClarity ?? "", "Obvious", "Decent") +
    score3(input.timeframeAlignment ?? "", "Fully Aligned", "Partially Aligned") +
    score3(input.retestQuality ?? "", "Strong", "Acceptable");

  const momentum =
    score3(input.volumeStrength ?? "", "Strong Expansion", "Normal") +
    score3(input.candleImpulse ?? "", "Strong", "Medium") +
    score3(input.followThrough ?? "", "Continuation Present", "Slowing");

  const entry =
    score3(input.entryDistance ?? "", "Optimal", "Acceptable") +
    score3(input.spaceToResistance ?? "", "Large Space", "Decent Space") +
    score3(input.rrQuality ?? "", "Asymmetric", "Acceptable");

  const risk =
    score3(input.overextension ?? "", "Calm", "Extended") +
    score3(input.eventRisk ?? "", "Low", "Medium") +
    score3(input.liquidityRisk ?? "", "High Liquidity", "Acceptable");

  const finalScore = Math.round(((market + structure + momentum + entry + risk) / 150) * 100);

  let tradeStatus: TradeStatus;
  if (finalScore < 40) tradeStatus = "Reject";
  else if (finalScore < 55) tradeStatus = "Watchlist";
  else if (finalScore < 68) tradeStatus = "Standard Trade";
  else if (finalScore < 82) tradeStatus = "High Conviction";
  else tradeStatus = "Expansion Trade";

  const allocationMap: Record<TradeStatus, number> = {
    "Reject": 0,
    "Watchlist": 0,
    "Standard Trade": 1,
    "High Conviction": 2.5,
    "Expansion Trade": 5,
  };

  const sl = Math.max(input.stopLossPct ?? 2, 0.1);
  const tp1 = input.tp1Pct ?? 0;
  const tp2 = input.tp2Pct ?? 0;
  const rr = tp1 > 0 && tp2 > 0 ? Math.round(((tp1 / sl + tp2 / sl) / 2) * 10) / 10 : 0;

  const tpStructure =
    tp1 > 0 && tp2 > 0
      ? `TP1 +${tp1}% / TP2 +${tp2}% — take 60% at TP1, trail 40%`
      : "Set TP1 and TP2 levels";

  const warnings: string[] = [];
  if (input.overextension === "Euphoric") warnings.push("Price euphoric — high reversal risk");
  if (input.eventRisk === "High") warnings.push("High event risk — reduce size or avoid");
  if (input.liquidityRisk === "Dangerous") warnings.push("Dangerous liquidity — slippage likely");
  if (input.btcCondition === "Bearish") warnings.push("BTC bearish — alts likely to underperform");
  if (input.timeframeAlignment === "Counter Trend") warnings.push("Counter-trend setup — lower probability");
  if (input.rrQuality === "Poor") warnings.push("Poor RR — consider skipping");
  if (input.followThrough === "Failing") warnings.push("Follow-through failing — momentum exhausted");
  if (rr > 0 && rr < 1.5) warnings.push("RR below 1.5:1 — not favorable");

  const decisionMap: Record<TradeStatus, string> = {
    "Reject": "REJECTED — Do not trade",
    "Watchlist": "WATCHLIST — Monitor only, no entry",
    "Standard Trade": "APPROVED — Standard allocation",
    "High Conviction": "APPROVED — High conviction",
    "Expansion Trade": "APPROVED — Full expansion",
  };

  return {
    finalScore,
    tradeStatus,
    suggestedAllocationPct: allocationMap[tradeStatus],
    suggestedSlPct: sl,
    suggestedTpStructure: tpStructure,
    suggestedRr: rr,
    warnings,
    finalDecision: decisionMap[tradeStatus],
  };
}
