import type { HistoricalSnapshot, ScoreResult, Trade, TradeInput } from "./types";

const SIMILARITY_WEIGHTS = {
  setupType: 30,
  timeframe: 20,
  btcTrend: 15,
  altTrend: 10,
  narrativeHeat: 10,
  narrativeCategory: 5,
  marketCapTier: 10,
} as const;

type SimilarityKey = keyof typeof SIMILARITY_WEIGHTS;

export interface SimilarTradeMatch {
  trade: Trade;
  similarityPct: number;
  weight: number;
}

export interface SimilarityResult extends ScoreResult {
  matches: SimilarTradeMatch[];
}

function norm(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function fieldSimilarity(input: TradeInput, trade: Trade, key: SimilarityKey): number {
  return norm(input[key]) === norm(trade[key]) ? 1 : 0;
}

function similarityPct(input: TradeInput, trade: Trade): number {
  let score = 0;
  for (const key of Object.keys(SIMILARITY_WEIGHTS) as SimilarityKey[]) {
    score += fieldSimilarity(input, trade, key) * SIMILARITY_WEIGHTS[key];
  }
  return score;
}

function avg(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function weightedAvg(rows: SimilarTradeMatch[], value: (trade: Trade) => number): number {
  const totalWeight = rows.reduce((sum, row) => sum + row.weight, 0);
  if (totalWeight <= 0) return 0;
  return rows.reduce((sum, row) => sum + value(row.trade) * row.weight, 0) / totalWeight;
}

function confidenceLevel(matchCount: number, averageSimilarityPct: number): HistoricalSnapshot["confidenceLevel"] {
  if (matchCount >= 20 && averageSimilarityPct >= 80) return "Very High Confidence";
  if (matchCount >= 10 && averageSimilarityPct >= 72) return "High Confidence";
  if (matchCount >= 5 && averageSimilarityPct >= 62) return "Medium Confidence";
  return "Low Confidence";
}

export function analyzeSimilarTrades(input: TradeInput, history: Trade[]): SimilarityResult {
  const historical = history.filter((trade) => trade.outcome && trade.actualPnlPct != null);
  const matches = historical
    .map((trade) => {
      const similarity = similarityPct(input, trade);
      return {
        trade,
        similarityPct: similarity,
        weight: (similarity / 100) ** 2,
      };
    })
    .filter((match) => match.similarityPct >= 55)
    .sort((a, b) => b.similarityPct - a.similarityPct);

  const returns = matches.map((match) => match.trade.actualPnlPct ?? 0);
  const wins = matches.filter((match) => match.trade.outcome === "win");
  const losses = matches.filter((match) => match.trade.outcome === "loss");
  const breakevens = matches.filter((match) => match.trade.outcome === "breakeven");
  const count = matches.length;
  const averageSimilarityPct = avg(matches.map((match) => match.similarityPct));
  const expectedReturnPct = weightedAvg(matches, (trade) => trade.actualPnlPct ?? 0);
  const weightedHistoricalWinRate = weightedAvg(matches, (trade) => (trade.outcome === "win" ? 100 : 0));

  const snapshot: HistoricalSnapshot = {
    similarTradesFound: count,
    averageSimilarityPct,
    nearMatches: matches.filter((match) => match.similarityPct >= 85).length,
    strongMatches: matches.filter((match) => match.similarityPct >= 70 && match.similarityPct < 85).length,
    looseMatches: matches.filter((match) => match.similarityPct >= 55 && match.similarityPct < 70).length,
    historicalWinRate: count ? (wins.length / count) * 100 : 0,
    historicalBreakevenRate: count ? (breakevens.length / count) * 100 : 0,
    historicalLossRate: count ? (losses.length / count) * 100 : 0,
    averageReturnPct: avg(returns),
    bestHistoricalTradePct: returns.length ? Math.max(...returns) : null,
    worstHistoricalTradePct: returns.length ? Math.min(...returns) : null,
    expectedReturnPct,
    weightedHistoricalWinRate,
    confidenceLevel: confidenceLevel(count, averageSimilarityPct),
    generatedAt: new Date().toISOString(),
  };

  return {
    historicalSnapshot: snapshot,
    matches,
    finalScore: Math.round(averageSimilarityPct),
    tradeStatus: "Historical Insight",
    suggestedAllocationPct: 0,
    suggestedSlPct: input.stopLossPct,
    suggestedTpStructure: "Planned targets",
    suggestedRr: weightedRr(input),
    warnings: [],
    finalDecision: "",
    scoredAt: snapshot.generatedAt,
    scoreBreakdown: { historicalSnapshot: snapshot },
  };
}

export function weightedRr(input: TradeInput): number {
  if (input.stopLossPct <= 0) return 0;
  const legs = [
    { pct: input.tp1Pct ?? 0, weight: input.tp1PositionPct },
    { pct: input.tp2Pct ?? 0, weight: input.tp2PositionPct },
    { pct: input.tp3Pct ?? 0, weight: input.tp3PositionPct },
  ].filter((leg) => leg.pct > 0 && leg.weight > 0);
  const total = legs.reduce((sum, leg) => sum + leg.weight, 0);
  if (!total) return 0;
  return legs.reduce((sum, leg) => sum + (leg.pct / input.stopLossPct) * (leg.weight / total), 0);
}
