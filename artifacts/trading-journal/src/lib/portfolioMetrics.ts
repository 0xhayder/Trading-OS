import type { CapitalAdjustment, Trade } from "./types";

/** Realized trading P&L in USD for one closed trade (prefers server field). */
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

export function totalCapitalAdjustmentsUsd(adjustments: CapitalAdjustment[]): number {
  const { depositsUsd, withdrawalsUsd } = splitCapitalAdjustments(adjustments);
  return Math.round((depositsUsd - withdrawalsUsd) * 100) / 100;
}

export function splitCapitalAdjustments(adjustments: CapitalAdjustment[]): {
  depositsUsd: number;
  withdrawalsUsd: number;
} {
  let depositsUsd = 0;
  let withdrawalsUsd = 0;
  for (const adjustment of adjustments) {
    if (adjustment.adjustmentType === "add") depositsUsd += adjustment.amountUsd;
    else withdrawalsUsd += adjustment.amountUsd;
  }
  return {
    depositsUsd: Math.round(depositsUsd * 100) / 100,
    withdrawalsUsd: Math.round(withdrawalsUsd * 100) / 100,
  };
}

export type AccountEquitySnapshot = {
  /** Starting equity before journal P&L and cash flows */
  baseEquityUsd: number;
  /** Closed-trade realized P&L */
  tradingPnlUsd: number;
  depositsUsd: number;
  withdrawalsUsd: number;
  /** deposits − withdrawals */
  adjustmentsNetUsd: number;
  /** base + trading P&L + adjustments (matches settings.totalCapital when synced) */
  netEquityUsd: number;
};

export function computeAccountEquitySnapshot(
  baseEquityUsd: number,
  closedTrades: Trade[],
  adjustments: CapitalAdjustment[],
): AccountEquitySnapshot {
  const tradingPnlUsd = totalRealizedUsd(closedTrades);
  const { depositsUsd, withdrawalsUsd } = splitCapitalAdjustments(adjustments);
  const adjustmentsNetUsd = Math.round((depositsUsd - withdrawalsUsd) * 100) / 100;
  const netEquityUsd = Math.round((baseEquityUsd + tradingPnlUsd + adjustmentsNetUsd) * 100) / 100;
  return {
    baseEquityUsd,
    tradingPnlUsd,
    depositsUsd,
    withdrawalsUsd,
    adjustmentsNetUsd,
    netEquityUsd,
  };
}

/**
 * Baseline trading equity before journal P&L and deposits/withdrawals.
 * In the simplified model, this is the base capital directly.
 */
export function initialCapitalUsd(
  baseEquityUsd: number,
  tradingPnlUsd?: number,
  capitalAdjustmentsUsd = 0,
): number {
  return baseEquityUsd;
}

/** Account return: trading P&L vs equity start (excludes deposits/withdrawals). */
export function accountReturnPct(initialUsd: number, totalRealizedUsd: number): number {
  if (initialUsd <= 0) return 0;
  return Math.round((totalRealizedUsd / initialUsd) * 10000) / 100;
}

/** @deprecated Use accountReturnPct */
export const totalReturnPct = accountReturnPct;

/** Sum of closed-trade % outcomes (not account-weighted). */
export function totalTradingReturnPct(closed: Trade[]): number {
  const sum = closed.reduce((s, t) => s + (t.actualPnlPct ?? 0), 0);
  return Math.round(sum * 100) / 100;
}

export type ReturnCurvePoint = { date: string; returnPct: number };

export function buildTradingReturnPctCurve(closedSortedOldestFirst: Trade[]): ReturnCurvePoint[] {
  const points: ReturnCurvePoint[] = [{ date: "Start", returnPct: 0 }];
  let cum = 0;
  for (const t of closedSortedOldestFirst) {
    cum += t.actualPnlPct ?? 0;
    points.push({
      date: labelDate(t.closedAt ?? t.createdAt),
      returnPct: Math.round(cum * 100) / 100,
    });
  }
  return points;
}

export function netEquityUsd(initialUsd: number, tradingPnlUsd: number, adjustmentsUsd: number): number {
  return Math.round((initialUsd + tradingPnlUsd + adjustmentsUsd) * 100) / 100;
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

function labelDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function buildTradingEquityCurveUsd(
  closedSortedOldestFirst: Trade[],
  initialUsd: number,
): EquityCurvePoint[] {
  const rounded = (n: number) => Math.round(n * 100) / 100;
  const points: EquityCurvePoint[] = [{ date: "Start", equityUsd: rounded(initialUsd) }];
  let cum = 0;
  for (const t of closedSortedOldestFirst) {
    cum += tradeRealizedUsd(t);
    points.push({ date: labelDate(t.closedAt ?? t.createdAt), equityUsd: rounded(initialUsd + cum) });
  }
  return points;
}

export function buildAdjustedEquityCurveUsd(
  closedSortedOldestFirst: Trade[],
  adjustments: CapitalAdjustment[],
  initialUsd: number,
): EquityCurvePoint[] {
  const rounded = (n: number) => Math.round(n * 100) / 100;
  const events = [
    ...closedSortedOldestFirst.map((trade) => ({
      date: trade.closedAt ?? trade.createdAt,
      delta: tradeRealizedUsd(trade),
    })),
    ...adjustments.map((adjustment) => ({
      date: adjustment.createdAt,
      delta: adjustment.adjustmentType === "add" ? adjustment.amountUsd : -adjustment.amountUsd,
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const points: EquityCurvePoint[] = [{ date: "Start", equityUsd: rounded(initialUsd) }];
  let equity = initialUsd;
  for (const event of events) {
    equity += event.delta;
    points.push({ date: labelDate(event.date), equityUsd: rounded(equity) });
  }
  return points;
}

export const buildEquityCurveUsd = buildTradingEquityCurveUsd;
