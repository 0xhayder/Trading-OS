interface TradeInputForScoring {
  btcCondition: string;
  altCondition: string;
  narrativeStrength: string;
  levelClarity: string;
  timeframeAlignment: string;
  retestQuality: string;
  volumeStrength: string;
  candleImpulse: string;
  followThrough: string;
  stopLossPct: number;
  tp1Pct: number;
  tp2Pct: number;
  entryDistance: string;
  spaceToResistance: string;
  rrQuality: string;
  overextension: string;
  eventRisk: string;
  liquidityRisk: string;
}

interface TradeScore {
  finalScore: number;
  tradeStatus: string;
  suggestedAllocationPct: number;
  suggestedSlPct: number;
  suggestedTpStructure: string;
  suggestedRr: number;
  tradeWarnings: string;
  calculatedRisk: number;
  expectedProfitPct: number;
  expectedLossPct: number;
  finalDecision: string;
}

const marketScore = (btc: string, alt: string, narrative: string): number => {
  let score = 0;

  if (btc === "Bullish") score += 10;
  else if (btc === "Neutral") score += 5;
  else score += 0;

  if (alt === "Bullish") score += 10;
  else if (alt === "Neutral") score += 5;
  else score += 0;

  if (narrative === "Hot") score += 10;
  else if (narrative === "Active") score += 5;
  else score += 0;

  return score;
};

const structureScore = (
  levelClarity: string,
  tfAlign: string,
  retestQuality: string
): number => {
  let score = 0;

  if (levelClarity === "Obvious") score += 10;
  else if (levelClarity === "Decent") score += 5;
  else score += 0;

  if (tfAlign === "Fully Aligned") score += 10;
  else if (tfAlign === "Partially Aligned") score += 5;
  else score += 0;

  if (retestQuality === "Strong") score += 10;
  else if (retestQuality === "Acceptable") score += 5;
  else score += 0;

  return score;
};

const momentumScore = (
  volume: string,
  candle: string,
  followThrough: string
): number => {
  let score = 0;

  if (volume === "Strong Expansion") score += 10;
  else if (volume === "Normal") score += 5;
  else score += 0;

  if (candle === "Strong") score += 10;
  else if (candle === "Medium") score += 5;
  else score += 0;

  if (followThrough === "Continuation Present") score += 10;
  else if (followThrough === "Slowing") score += 5;
  else score += 0;

  return score;
};

const entryScore = (
  entryDistance: string,
  spaceToResistance: string,
  rrQuality: string
): number => {
  let score = 0;

  if (entryDistance === "Optimal") score += 10;
  else if (entryDistance === "Acceptable") score += 5;
  else score += 0;

  if (spaceToResistance === "Large Space") score += 10;
  else if (spaceToResistance === "Decent Space") score += 5;
  else score += 0;

  if (rrQuality === "Asymmetric") score += 10;
  else if (rrQuality === "Acceptable") score += 5;
  else score += 0;

  return score;
};

const riskScore = (
  overextension: string,
  eventRisk: string,
  liquidityRisk: string
): number => {
  let score = 0;

  if (overextension === "Calm") score += 10;
  else if (overextension === "Extended") score += 5;
  else score += 0;

  if (eventRisk === "Low") score += 10;
  else if (eventRisk === "Medium") score += 5;
  else score += 0;

  if (liquidityRisk === "High Liquidity") score += 10;
  else if (liquidityRisk === "Acceptable") score += 5;
  else score += 0;

  return score;
};

export function scoreTradeInput(input: TradeInputForScoring): TradeScore {
  const market = marketScore(
    input.btcCondition,
    input.altCondition,
    input.narrativeStrength
  );
  const structure = structureScore(
    input.levelClarity,
    input.timeframeAlignment,
    input.retestQuality
  );
  const momentum = momentumScore(
    input.volumeStrength,
    input.candleImpulse,
    input.followThrough
  );
  const entry = entryScore(
    input.entryDistance,
    input.spaceToResistance,
    input.rrQuality
  );
  const risk = riskScore(
    input.overextension,
    input.eventRisk,
    input.liquidityRisk
  );

  const rawTotal = market + structure + momentum + entry + risk;
  const finalScore = Math.round((rawTotal / 150) * 100);

  let tradeStatus: string;
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

  const suggestedSlPct = Math.max(input.stopLossPct, 1);

  const rr1 = input.tp1Pct / suggestedSlPct;
  const rr2 = input.tp2Pct / suggestedSlPct;
  const suggestedRr = Math.round(((rr1 + rr2) / 2) * 10) / 10;

  const suggestedTpStructure = `TP1 at ${input.tp1Pct}% / TP2 at ${input.tp2Pct}% — Take 60% at TP1, let 40% run to TP2`;

  const warnings: string[] = [];
  if (input.overextension === "Euphoric") warnings.push("Price is euphoric — high reversal risk");
  if (input.eventRisk === "High") warnings.push("High event risk — reduce size or avoid");
  if (input.liquidityRisk === "Dangerous") warnings.push("Dangerous liquidity — exit may be compromised");
  if (input.btcCondition === "Bearish") warnings.push("BTC is bearish — alts likely to underperform");
  if (input.timeframeAlignment === "Counter Trend") warnings.push("Counter-trend trade — lower probability setup");
  if (input.rrQuality === "Poor") warnings.push("Poor RR quality — consider skipping");
  if (input.followThrough === "Failing") warnings.push("Follow-through failing — momentum may be exhausted");
  if (rr2 < 1.5) warnings.push("RR below 1.5 — risk/reward not favorable");

  const tradeWarnings = warnings.join(" | ");

  const calculatedRisk = suggestedAllocationPct > 0
    ? Math.round((suggestedSlPct / 100) * suggestedAllocationPct * 100) / 100
    : 0;

  const expectedProfitPct = Math.round(suggestedAllocationPct * (input.tp2Pct / 100) * 100) / 100;
  const expectedLossPct = Math.round(suggestedAllocationPct * (suggestedSlPct / 100) * 100) / 100;

  let finalDecision: string;
  if (finalScore < 40) finalDecision = "REJECTED — Do not take this trade";
  else if (finalScore < 55) finalDecision = "WATCHLIST — Monitor but do not enter yet";
  else if (finalScore < 68) finalDecision = "APPROVED — Standard position, full checklist met";
  else if (finalScore < 82) finalDecision = "HIGH CONVICTION — Increase size, strong setup";
  else finalDecision = "EXPANSION TRADE — Maximum allocation, elite setup";

  return {
    finalScore,
    tradeStatus,
    suggestedAllocationPct,
    suggestedSlPct,
    suggestedTpStructure,
    suggestedRr,
    tradeWarnings,
    calculatedRisk,
    expectedProfitPct,
    expectedLossPct,
    finalDecision,
  };
}
