import type { EngineTradeInput } from "../types";

export function strengthToScore100(s: number): number {
  const clamped = Math.min(1, Math.max(-2, s));
  return Math.round((((clamped + 2) / 3) * 100 + Number.EPSILON) * 100) / 100;
}

export function isBullishTrend(t: EngineTradeInput["market"]["btcTrend"]): boolean {
  return t === "bullish" || t === "strong_bullish";
}

export function isBearishTrend(t: EngineTradeInput["market"]["btcTrend"]): boolean {
  return t === "bearish" || t === "strong_bearish";
}

export function isNeutralTrend(t: EngineTradeInput["market"]["btcTrend"]): boolean {
  return t === "neutral";
}

export function marketStrength(
  input: EngineTradeInput["market"],
): { btc: number; alt: number; narrative: number } {
  return {
    btc: trendStrength(input.btcTrend),
    alt: trendStrength(input.altTrend),
    narrative: narrativeStrength(input.narrative),
  };
}

export function trendStrength(t: EngineTradeInput["market"]["btcTrend"]): number {
  switch (t) {
    case "strong_bullish":
    case "bullish":
      return 1;
    case "neutral":
      return 0.25;
    case "bearish":
    case "strong_bearish":
      return -1;
    default:
      return 0.25;
  }
}

export function narrativeStrength(n: EngineTradeInput["market"]["narrative"]): number {
  switch (n) {
    case "hot":
      return 1;
    case "active":
    case "neutral":
      return 0.25;
    case "weak":
    case "dead":
      return -1;
    default:
      return 0.25;
  }
}

export function retestStrength(r: EngineTradeInput["structure"]["retestConfirmation"]): number {
  switch (r) {
    case "strong":
      return 1;
    case "decent":
      return 0.25;
    case "weak":
      return -1.5;
    case "none":
      return -1;
    default:
      return 0.25;
  }
}

export function levelClarityStrength(sr: EngineTradeInput["structure"]["srClarity"]): number {
  switch (sr) {
    case "extremely_obvious":
      return 1;
    case "clean":
      return 0.25;
    case "medium":
      return 0.25;
    case "forced":
      return -1.5;
    default:
      return 0.25;
  }
}

export function htfStrength(h: EngineTradeInput["structure"]["htfAlignment"]): number {
  switch (h) {
    case "full":
      return 1;
    case "partial":
      return 0.25;
    case "conflict":
      return -1;
    default:
      return 0.25;
  }
}

export function volumeStrength(rel: EngineTradeInput["momentum"]["relVolume"]): number {
  switch (rel) {
    case "above_2x":
      return 1;
    case "one_point_five_x":
      return 0.25;
    case "average":
      return 0.25;
    case "below_average":
      return -1;
    default:
      return 0.25;
  }
}

export function candleStrength(c: EngineTradeInput["momentum"]["candleStrength"]): number {
  switch (c) {
    case "explosive":
    case "strong":
      return 1;
    case "weak":
      return -1;
    default:
      return 0.25;
  }
}

export function followThroughStrength(v: EngineTradeInput["momentum"]["expansionVelocity"]): number {
  switch (v) {
    case "aggressive":
      return 1;
    case "healthy":
      return 0.25;
    case "slow":
      return -1;
    default:
      return 0.25;
  }
}

export function entryDistanceStrength(e: EngineTradeInput["entry"]["entryEfficiency"]): number {
  switch (e) {
    case "perfect":
      return 1;
    case "decent":
      return 0.25;
    case "chased":
      return -1;
    default:
      return 0.25;
  }
}

export function resistanceSpaceStrength(d: EngineTradeInput["entry"]["distanceToResistance"]): number {
  switch (d) {
    case "large":
      return 1;
    case "decent":
      return 0.25;
    case "nearby":
      return -1;
    default:
      return 0.25;
  }
}

export function rrQualityStrength(q: EngineTradeInput["entry"]["rrQuality"]): number {
  switch (q) {
    case "strong":
      return 1;
    case "acceptable":
      return 0.25;
    case "poor":
      return -1.25;
    default:
      return 0.25;
  }
}

export function overextensionStrength(o: EngineTradeInput["risk"]["overextension"]): number {
  switch (o) {
    case "controlled":
      return 1;
    case "extended":
      return 0.25;
    case "euphoric":
      return -1.5;
    default:
      return 0.25;
  }
}

export function eventRiskStrength(e: EngineTradeInput["risk"]["eventRisk"]): number {
  switch (e) {
    case "low":
      return 1;
    case "medium":
      return 0.25;
    case "high":
      return -1;
    default:
      return 0.25;
  }
}

export function liquidityRiskStrength(l: EngineTradeInput["risk"]["liquidityRisk"]): number {
  switch (l) {
    case "safe":
      return 1;
    case "caution":
      return 0.25;
    case "dangerous":
      return -2;
    default:
      return 0.25;
  }
}

export function isVolumeStrong(rel: EngineTradeInput["momentum"]["relVolume"]): boolean {
  return rel === "above_2x";
}

export function isCandleStrong(c: EngineTradeInput["momentum"]["candleStrength"]): boolean {
  return c === "explosive" || c === "strong";
}

export function isFollowThroughStrong(v: EngineTradeInput["momentum"]["expansionVelocity"]): boolean {
  return v === "aggressive";
}

export function isMomentumWeak(input: EngineTradeInput["momentum"]): boolean {
  const weakVol = input.relVolume === "below_average";
  const weakCandle = input.candleStrength === "weak";
  const weakVel = input.expansionVelocity === "slow";
  let weakCount = 0;
  if (weakVol) weakCount++;
  if (weakCandle) weakCount++;
  if (weakVel) weakCount++;
  return weakCount >= 2;
}

export function isMomentumStrongPack(input: EngineTradeInput["momentum"]): boolean {
  return (
    isVolumeStrong(input.relVolume) &&
    isCandleStrong(input.candleStrength) &&
    (input.expansionVelocity === "aggressive" || input.expansionVelocity === "healthy")
  );
}

export function messyLevel(sr: EngineTradeInput["structure"]["srClarity"]): boolean {
  return sr === "forced" || sr === "medium";
}
