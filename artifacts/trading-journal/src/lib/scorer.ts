import type { TradeInput, TradeScore } from "./types";

function marketScore(btc: string, alt: string, narrative: string): number {
  let s = 0;
  s += btc === "Bullish" ? 10 : btc === "Neutral" ? 5 : 0;
  s += alt === "Bullish" ? 10 : alt === "Neutral" ? 5 : 0;
  s += narrative === "Hot" ? 10 : narrative === "Active" ? 5 : 0;
  return s;
}

function structureScore(levelClarity: string, tfAlign: string, retestQuality: string): number {
  let s = 0;
  s += levelClarity === "Obvious" ? 10 : levelClarity === "Decent" ? 5 : 0;
  s += tfAlign === "Fully Aligned" ? 10 : tfAlign === "Partially Aligned" ? 5 : 0;
  s += retestQuality === "Strong" ? 10 : retestQuality === "Acceptable" ? 5 : 0;
  return s;
}

function momentumScore(volume: string, candle: string, followThrough: string): number {
  let s = 0;
  s += volume === "Strong Expansion" ? 10 : volume === "Normal" ? 5 : 0;
  s += candle === "Strong" ? 10 : candle === "Medium" ? 5 : 0;
  s += followThrough === "Continuation Present" ? 10 : followThrough === "Slowing" ? 5 : 0;
  return s;
}

function entryScore(entryDistance: string, spaceToResistance: string, rrQuality: string): number {
  let s = 0;
  s += entryDistance === "Optimal" ? 10 : entryDistance === "Acceptable" ? 5 : 0;
  s += spaceToResistance === "Large Space" ? 10 : spaceToResistance === "Decent Space" ? 5 : 0;
  s += rrQuality === "Asymmetric" ? 10 : rrQuality === "Acceptable" ? 5 : 0;
  return s;
}

function riskScore(overextension: string, eventRisk: string, liquidityRisk: string): number {
  let s = 0;
  s += overextension === "Calm" ? 10 : overextension === "Extended" ? 5 : 0;
  s += eventRisk === "Low" ? 10 : eventRisk === "Medium" ? 5 : 0;
  s += liquidityRisk === "High Liquidity" ? 10 : liquidityRisk === "Acceptable" ? 5 : 0;
  return s;
}

export function scoreTradeInput(input: Partial<TradeInput>): TradeScore {
  const market = marketScore(
    input.btcCondition ?? "",
    input.altCondition ?? "",
    input.narrativeStrength ?? ""
  );
  const structure = structureScore(
    input.levelClarity ?? "",
    input.timeframeAlignment ?? "",
    input.retestQuality ?? ""
  );
  const momentum = momentumScore(
    input.volumeStrength ?? "",
    input.candleImpulse ?? "",
    input.followThrough ?? ""
  );
  const entry = entryScore(
    input.entryDistance ?? "",
    input.spaceToResistance ?? "",
    input.rrQuality ?? ""
  );
  const risk = riskScore(
    input.overextension ?? "",
    input.eventRisk ?? "",
    input.liquidityRisk ?? ""
  );

  const rawTotal = market + structure + momentum + entry + risk;
  const finalScore = Math.round((rawTotal / 150) * 100);

  let tradeStatus: TradeScore["tradeStatus"];
  if (finalScore < 40) tradeStatus = "Reject";
  else if (finalScore < 55) tradeStatus = "Watchlist";
  else if (finalScore < 68) tradeStatus = "Standard Trade";
  else if (finalScore < 82) tradeStatus = "High Conviction";
  else tradeStatus = "Expansion Trade";

  let suggestedAllocationPct: number;
  if (finalScore < 40) suggestedAllocationPct = 0;
  else if (finalScore < 55) suggestedAllocationPct = 0;
  else if (finalScore < 68) suggestedAllocationPct = 1;
  else if (finalScore < 82) suggestedAllocationPct = 2.5;
  else suggestedAllocationPct = 5;

  const sl = Math.max(input.stopLossPct ?? 2, 0.1);
  const tp1 = input.tp1Pct ?? 0;
  const tp2 = input.tp2Pct ?? 0;
  const suggestedSlPct = sl;
  const rr1 = tp1 / sl;
  const rr2 = tp2 / sl;
  const suggestedRr = Math.round(((rr1 + rr2) / 2) * 10) / 10;
  const suggestedTpStructure =
    tp1 > 0 && tp2 > 0
      ? `TP1 +${tp1}% / TP2 +${tp2}% — 60% at TP1, let 40% run`
      : "Set TP levels to generate structure";

  const warnings: string[] = [];
  if (input.overextension === "Euphoric") warnings.push("Price euphoric — high reversal risk");
  if (input.eventRisk === "High") warnings.push("High event risk — reduce size or avoid");
  if (input.liquidityRisk === "Dangerous") warnings.push("Dangerous liquidity — exit may slip");
  if (input.btcCondition === "Bearish") warnings.push("BTC bearish — alts likely to underperform");
  if (input.timeframeAlignment === "Counter Trend") warnings.push("Counter-trend — lower probability");
  if (input.rrQuality === "Poor") warnings.push("Poor RR quality — consider skipping");
  if (input.followThrough === "Failing") warnings.push("Follow-through failing — momentum exhausted");
  if (suggestedRr > 0 && suggestedRr < 1.5) warnings.push("RR below 1.5:1 — not favorable");

  const calculatedRisk =
    suggestedAllocationPct > 0
      ? Math.round((sl / 100) * suggestedAllocationPct * 100) / 100
      : 0;

  const expectedProfitPct = Math.round(suggestedAllocationPct * (tp2 / 100) * 100) / 100;
  const expectedLossPct = Math.round(suggestedAllocationPct * (sl / 100) * 100) / 100;

  let finalDecision: string;
  if (finalScore < 40) finalDecision = "REJECTED";
  else if (finalScore < 55) finalDecision = "WATCHLIST ONLY";
  else if (finalScore < 68) finalDecision = "APPROVED — STANDARD";
  else if (finalScore < 82) finalDecision = "APPROVED — HIGH CONVICTION";
  else finalDecision = "APPROVED — EXPANSION";

  return {
    finalScore,
    tradeStatus,
    suggestedAllocationPct,
    suggestedSlPct,
    suggestedTpStructure,
    suggestedRr,
    tradeWarnings: warnings,
    calculatedRisk,
    expectedProfitPct,
    expectedLossPct,
    finalDecision,
  };
}
