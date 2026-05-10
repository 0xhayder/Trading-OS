import type { AnalyticsReport, ClosedTradeForAnalytics } from "./types";

function isWin(o: string | null | undefined, pnl: number | null): boolean {
  if (o === "win") return true;
  if (o === "loss" || o === "breakeven") return false;
  if (pnl == null) return false;
  return pnl > 0;
}

function groupBy<T>(
  rows: ClosedTradeForAnalytics[],
  keyFn: (t: ClosedTradeForAnalytics) => string,
): Map<string, ClosedTradeForAnalytics[]> {
  const m = new Map<string, ClosedTradeForAnalytics[]>();
  for (const r of rows) {
    const k = keyFn(r);
    const arr = m.get(k) ?? [];
    arr.push(r);
    m.set(k, arr);
  }
  return m;
}

function summarizeBucket(trades: ClosedTradeForAnalytics[]): {
  tradeCount: number;
  winRate: number;
  pnlPctSum: number;
} {
  const wins = trades.filter((t) => isWin(t.outcome, t.pnlPct));
  const pnlSum = trades.reduce((s, t) => s + (t.pnlPct ?? 0), 0);
  return {
    tradeCount: trades.length,
    winRate: trades.length ? wins.length / trades.length : 0,
    pnlPctSum: Math.round(pnlSum * 100) / 100,
  };
}

export function computeAnalyticsReport(trades: ClosedTradeForAnalytics[]): AnalyticsReport {
  const closed = trades.filter((t) => t.pnlPct != null && t.outcome);
  const n = closed.length;

  if (n === 0) {
    return {
      sampleSize: 0,
      winRate: 0,
      expectancyRPerTrade: 0,
      avgRr: 0,
      avgHoldHours: 0,
      profitFactor: 0,
      maxDrawdownPct: 0,
      bestSetups: [],
      worstSetups: [],
      bestAssets: [],
      bestTimeframes: [],
      mistakeFrequency: [],
      psychologicalErrors: [],
      byMarketRegime: {},
    };
  }

  const wins = closed.filter((t) => isWin(t.outcome, t.pnlPct));
  const winRate = wins.length / n;

  const pnls = closed.map((t) => t.pnlPct ?? 0);
  const expectancyRPerTrade = pnls.reduce((a, b) => a + b, 0) / n;

  const rrVals = closed.map((t) => t.suggestedRr).filter((x): x is number => x != null);
  const avgRr = rrVals.length ? rrVals.reduce((a, b) => a + b, 0) / rrVals.length : 0;

  const holds = closed.map((t) => t.holdDurationHours).filter((x): x is number => x != null);
  const avgHoldHours = holds.length ? holds.reduce((a, b) => a + b, 0) / holds.length : 0;

  const gain = pnls.filter((p) => p > 0).reduce((a, b) => a + b, 0);
  const loss = Math.abs(pnls.filter((p) => p < 0).reduce((a, b) => a + b, 0));
  const profitFactor = loss === 0 ? gain : Math.round((gain / loss) * 100) / 100;

  let peak = 0;
  let equity = 0;
  let maxDd = 0;
  const sorted = [...closed].sort(
    (a, b) => (a.closedAt?.getTime() ?? 0) - (b.closedAt?.getTime() ?? 0),
  );
  for (const t of sorted) {
    equity += t.pnlPct ?? 0;
    peak = Math.max(peak, equity);
    maxDd = Math.max(maxDd, peak - equity);
  }

  const bySetup = groupBy(closed, (t) => t.setupType || "unknown");
  const setupRows = [...bySetup.entries()].map(([setup, rows]) => ({
    setup,
    ...summarizeBucket(rows),
  }));
  const bestSetups = setupRows
    .filter((s) => s.tradeCount >= 1)
    .sort((a, b) => b.pnlPctSum - a.pnlPctSum)
    .slice(0, 5)
    .map(({ setup, tradeCount, winRate: wr, pnlPctSum }) => ({
      setup,
      tradeCount,
      winRate: Math.round(wr * 1000) / 10,
      pnlPctSum,
    }));
  const worstSetups = setupRows
    .filter((s) => s.tradeCount >= 1)
    .sort((a, b) => a.pnlPctSum - b.pnlPctSum)
    .slice(0, 5)
    .map(({ setup, tradeCount, winRate: wr, pnlPctSum }) => ({
      setup,
      tradeCount,
      winRate: Math.round(wr * 1000) / 10,
      pnlPctSum,
    }));

  const byCoin = groupBy(closed, (t) => t.coin || "unknown");
  const coinRows = [...byCoin.entries()].map(([coin, rows]) => ({
    coin,
    ...summarizeBucket(rows),
  }));
  const bestAssets = coinRows
    .filter((s) => s.tradeCount >= 1)
    .sort((a, b) => b.pnlPctSum - a.pnlPctSum)
    .slice(0, 5)
    .map(({ coin, tradeCount, winRate: wr, pnlPctSum }) => ({
      coin,
      tradeCount,
      winRate: Math.round(wr * 1000) / 10,
      pnlPctSum,
    }));

  const byTf = groupBy(closed, (t) => t.timeframe || "n/a");
  const tfRows = [...byTf.entries()].map(([timeframe, rows]) => ({
    timeframe,
    ...summarizeBucket(rows),
  }));
  const bestTimeframes = tfRows
    .filter((s) => s.tradeCount >= 1)
    .sort((a, b) => b.pnlPctSum - a.pnlPctSum)
    .slice(0, 5)
    .map(({ timeframe, tradeCount, winRate: wr, pnlPctSum }) => ({
      timeframe,
      tradeCount,
      winRate: Math.round(wr * 1000) / 10,
      pnlPctSum,
    }));

  const mistakeMap = new Map<string, number>();
  const psychMap = new Map<string, number>();
  for (const t of closed) {
    for (const tag of t.mistakeTags ?? []) {
      mistakeMap.set(tag, (mistakeMap.get(tag) ?? 0) + 1);
    }
    for (const tag of t.psychologyTags ?? []) {
      psychMap.set(tag, (psychMap.get(tag) ?? 0) + 1);
    }
  }
  const mistakeFrequency = [...mistakeMap.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
  const psychologicalErrors = [...psychMap.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);

  const byMarketRegime: AnalyticsReport["byMarketRegime"] = {};
  const regimeGroups = groupBy(closed, (t) => t.marketRegime ?? "unspecified");
  for (const [reg, arr] of regimeGroups) {
    const w = arr.filter((x) => isWin(x.outcome, x.pnlPct));
    byMarketRegime[reg] = {
      tradeCount: arr.length,
      winRate: Math.round((w.length / arr.length) * 1000) / 10,
      pnlPctSum: Math.round(arr.reduce((s, x) => s + (x.pnlPct ?? 0), 0) * 100) / 100,
    };
  }

  const rejected = trades.filter((t) => t.wasRejectedByEngine);
  const hypotheticalWins = rejected.filter((t) => t.hypothetical && isWin(t.outcome, t.pnlPct)).length;
  const falseNegatives = rejected.filter((t) => isWin(t.outcome, t.pnlPct)).length;

  return {
    sampleSize: n,
    winRate: Math.round(winRate * 1000) / 10,
    expectancyRPerTrade: Math.round(expectancyRPerTrade * 100) / 100,
    avgRr: Math.round(avgRr * 100) / 100,
    avgHoldHours: Math.round(avgHoldHours * 10) / 10,
    profitFactor,
    maxDrawdownPct: Math.round(maxDd * 100) / 100,
    bestSetups,
    worstSetups,
    bestAssets,
    bestTimeframes,
    mistakeFrequency,
    psychologicalErrors,
    byMarketRegime,
    rejectedFollowup: rejected.length
      ? {
          hypotheticalWins,
          falseNegatives,
          tracked: rejected.length,
        }
      : undefined,
  };
}
