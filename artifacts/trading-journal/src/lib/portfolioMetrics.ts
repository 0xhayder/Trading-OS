import type { Trade } from "./types";

/** Realized P&L in USD for one closed trade (prefers server field). */
export function tradeRealizedUsd(t: Trade): number {
  if (t.realizedPnlUsd != null) return t.realizedPnlUsd;
  if (t.allocatedAmountUsd != null && t.actualPnlPct != null) {
    return t.allocatedAmountUsd * (t.actualPnlPct / 100);
  }
  return 0;
}

export function totalRealizedUsd(closed: Trade[]): number {
  const sum = closed.reduce((s, t) => s + tradeRealizedUsd(t), 0);
  return Math.round(sum * 100) / 100;
}

/**
 * Equity before any closed P&L in this journal, derived from current capital:
 * currentCapital = initial + sum(realized). Assumes capital only moves via logged closes.
 */
export function initialCapitalUsd(currentTotalCapital: number, totalRealizedUsd: number): number {
  const raw = currentTotalCapital - totalRealizedUsd;
  return Math.max(Math.round(raw * 100) / 100, 0.01);
}

/** Cumulative account return vs initial equity (not sum of per-trade %). */
export function totalReturnPct(initialUsd: number, totalRealizedUsd: number): number {
  if (initialUsd <= 0) return 0;
  return Math.round((totalRealizedUsd / initialUsd) * 10000) / 100;
}

export function isWinningClosed(t: Trade): boolean {
  return t.outcome === "win";
}

export function isLosingClosed(t: Trade): boolean {
  return t.outcome === "loss";
}

export function isBreakevenClosed(t: Trade): boolean {
  return t.outcome === "breakeven";
}

export type EquityCurvePoint = { date: string; equityUsd: number };

export function buildEquityCurveUsd(
  closedSortedOldestFirst: Trade[],
  initialUsd: number,
): EquityCurvePoint[] {
  const rounded = (n: number) => Math.round(n * 100) / 100;
  const points: EquityCurvePoint[] = [
    { date: "Start", equityUsd: rounded(initialUsd) },
  ];
  let cum = 0;
  for (const t of closedSortedOldestFirst) {
    cum += tradeRealizedUsd(t);
    points.push({
      date: new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      equityUsd: rounded(initialUsd + cum),
    });
  }
  return points;
}
