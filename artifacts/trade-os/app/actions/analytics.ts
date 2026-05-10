"use server";

import {
  computeAnalyticsReport,
  type AnalyticsReport,
  type ClosedTradeForAnalytics,
} from "@workspace/trading-engine";

export async function computeAnalyticsAction(
  trades: ClosedTradeForAnalytics[],
): Promise<AnalyticsReport> {
  return computeAnalyticsReport(trades);
}
