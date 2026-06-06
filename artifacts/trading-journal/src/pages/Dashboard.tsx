import { Link } from "wouter";
import { useCapitalAdjustments, useSettings, useTrades } from "@/lib/store";
import CapitalSummary from "@/components/CapitalSummary";
import {
  accountReturnPct,
  buildNetPnlCurveUsd,
  buildTradingReturnPctCurve,
  initialCapitalUsd,
  isBreakevenClosed,
  isLosingClosed,
  isWinningClosed,
  totalCapitalAdjustmentsUsd,
  totalRealizedUsd,
  totalTradingReturnPct,
} from "@/lib/portfolioMetrics";
import { PerformanceAreaChart } from "@/components/PerformanceAreaChart";
import { StatCard } from "@/components/StatCard";
import { formatTradeDateTime } from "@/lib/formatDates";

export default function Dashboard() {
  const { trades } = useTrades();
  const { settings } = useSettings();
  const { adjustments } = useCapitalAdjustments();

  const closed = trades.filter((t) => t.outcome && t.actualPnlPct != null);
  const open = trades.filter((t) => !t.outcome);
  const wins = closed.filter(isWinningClosed);
  const losses = closed.filter(isLosingClosed);
  const breakevens = closed.filter(isBreakevenClosed);
  const totalPnlUsd = totalRealizedUsd(closed);
  const adjustmentsUsd = totalCapitalAdjustmentsUsd(adjustments);
  const equityStartUsd = initialCapitalUsd(settings.totalCapital, totalPnlUsd, adjustmentsUsd);
  const accountReturn = accountReturnPct(equityStartUsd, totalPnlUsd);
  const tradingReturn = totalTradingReturnPct(closed);
  const decided = wins.length + losses.length;
  const winRate = decided > 0 ? (wins.length / decided) * 100 : 0;

  const closedChrono = [...closed].sort(
    (a, b) => new Date(a.closedAt ?? a.createdAt).getTime() - new Date(b.closedAt ?? b.createdAt).getTime(),
  );
  const netPnlCurve = buildNetPnlCurveUsd(closedChrono);
  const tradingReturnCurve = buildTradingReturnPctCurve(closedChrono);

  const recent = [...trades]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  const statusColor: Record<string, string> = {
    "Expansion Trade": "text-green-400",
    "High Conviction Trade": "text-green-400",
    "Standard Trade": "text-foreground/70",
    "Asymmetric Swing Trade": "text-green-400",
    "Aggressive Trade": "text-green-400",
    "Balanced Trade": "text-foreground/70",
    "Watchlist Only": "text-yellow-500",
    "Reject Trade": "text-red-400",
  };

  const pctColor = (v: number) => (v > 0 ? "text-green-400" : v < 0 ? "text-red-400" : undefined);
  const closedLabel = `${wins.length}W/${losses.length}L${breakevens.length ? `/${breakevens.length}BE` : ""}/${open.length}O`;

  const chartHeight = 240;

  return (
    <div className="p-6 space-y-6 w-full min-w-0">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-semibold">Dashboard</h1>
        <CapitalSummary />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        <StatCard
          size="md"
          label="Account Return"
          value={`${accountReturn >= 0 ? "+" : ""}${accountReturn.toFixed(2)}%`}
          color={pctColor(accountReturn)}
        />
        <StatCard
          size="md"
          label="Total PnL"
          value={`${totalPnlUsd >= 0 ? "+" : ""}$${totalPnlUsd.toFixed(2)}`}
          color={pctColor(totalPnlUsd)}
        />
        <StatCard
          size="md"
          label="Trading Return"
          value={`${tradingReturn >= 0 ? "+" : ""}${tradingReturn.toFixed(2)}%`}
          color={pctColor(tradingReturn)}
        />
        <StatCard
          size="md"
          label="Win Rate"
          value={`${winRate.toFixed(1)}%`}
          color={winRate >= 50 ? "text-green-400" : closed.length > 0 ? "text-red-400" : undefined}
        />
        <StatCard size="md" label="Closed / Open" value={closedLabel} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 pt-2">
        <div className="border border-border rounded-sm p-4 min-w-0">
          <div className="section-label mb-3">Net PnL $</div>
          {netPnlCurve.length > 1 ? (
            <PerformanceAreaChart
              data={netPnlCurve}
              dataKey="pnlUsd"
              height={chartHeight}
              yTickFormatter={(v) => `${Number(v) >= 0 ? "+" : "-"}$${Math.abs(Number(v)).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              tooltipFormatter={(v) => [`${Number(v) >= 0 ? "+" : "-"}$${Math.abs(Number(v)).toFixed(2)}`, "Net PnL"]}
            />
          ) : (
            <div
              className="flex items-center justify-center text-xs text-muted-foreground"
              style={{ height: chartHeight }}
            >
              Close trades to build net PnL
            </div>
          )}
        </div>

        <div className="border border-border rounded-sm p-4 min-w-0">
          <div className="section-label mb-3">Trading return %</div>
          {tradingReturnCurve.length > 1 ? (
            <PerformanceAreaChart
              data={tradingReturnCurve}
              dataKey="returnPct"
              height={chartHeight}
              yTickFormatter={(v) => `${Number(v).toFixed(0)}%`}
              tooltipFormatter={(v) => [`${Number(v).toFixed(2)}%`, "Trading Return"]}
            />
          ) : (
            <div
              className="flex items-center justify-center text-xs text-muted-foreground"
              style={{ height: chartHeight }}
            >
              Close trades to build trading return curve
            </div>
          )}
        </div>
      </div>

      <div className="border border-border rounded-sm">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
          <span className="section-label">Recent Trades</span>
          <Link href="/journal">
            <span className="text-xs text-muted-foreground hover:text-foreground cursor-pointer">View all</span>
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-muted-foreground">
            No trades logged yet.{" "}
            <Link href="/new-trade">
              <span className="text-foreground hover:underline cursor-pointer">Log your first trade</span>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recent.map((t) => (
              <div key={t.id} className="px-4 py-3 flex items-center gap-3">
                <div
                  className={`w-1 h-1 rounded-full shrink-0 ${
                    t.outcome === "win"
                      ? "bg-green-400"
                      : t.outcome === "loss"
                        ? "bg-red-400"
                        : t.outcome === "breakeven"
                          ? "bg-muted-foreground"
                          : "bg-yellow-500"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-mono font-medium">{t.coin}</span>
                    <span className="text-muted-foreground text-xs">{t.setupType}</span>
                    <span className="text-muted-foreground text-xs">· {t.marketCapTier ?? t.timeframe ?? "Unclassified"}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                    {formatTradeDateTime(t.createdAt)}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-xs font-mono ${statusColor[t.tradeStatus] ?? ""}`}>{t.tradeStatus}</div>
                  <div className="text-[10px] font-mono text-muted-foreground">{t.finalScore}/100</div>
                </div>
                {t.actualPnlPct != null && (
                  <div
                    className={`font-mono text-sm w-14 text-right shrink-0 ${
                      t.outcome === "breakeven" || t.actualPnlPct === 0
                        ? "text-muted-foreground"
                        : t.actualPnlPct > 0
                          ? "text-green-400"
                          : "text-red-400"
                    }`}
                  >
                    {t.actualPnlPct > 0 ? "+" : ""}{t.actualPnlPct.toFixed(2)}%
                  </div>
                )}
                {!t.outcome && (
                  <div className="font-mono text-[10px] text-yellow-500 w-14 text-right shrink-0">OPEN</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
