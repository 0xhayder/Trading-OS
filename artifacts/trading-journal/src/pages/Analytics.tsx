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
  tradeRealizedUsd,
  totalCapitalAdjustmentsUsd,
  totalRealizedUsd,
  totalTradingReturnPct,
} from "@/lib/portfolioMetrics";
import { PerformanceAreaChart } from "@/components/PerformanceAreaChart";
import { CHART_MARGIN, chartBarXAxisProps } from "@/lib/chartAxis";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import type { Trade } from "@/lib/types";

const TT = {
  contentStyle: {
    background: "hsl(0 0% 8%)",
    border: "1px solid hsl(0 0% 14%)",
    borderRadius: "2px",
    fontSize: "11px",
    fontFamily: "var(--app-font-mono)",
  },
  labelStyle: { color: "hsl(0 0% 45%)" },
  itemStyle: { color: "hsl(0 0% 80%)" },
};

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function tagList(tags: unknown): string[] {
  if (Array.isArray(tags)) return tags.filter((tag): tag is string => typeof tag === "string");
  if (typeof tags === "string") return tags.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

function fmtPct(value: number, signed = false) {
  const prefix = signed && value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}%`;
}

function fmtUsd(value: number, signed = true) {
  const prefix = signed && value > 0 ? "+" : value < 0 ? "-" : "";
  return `${prefix}$${Math.abs(value).toFixed(2)}`;
}

function tone(value: number) {
  return value > 0 ? "text-green-400" : value < 0 ? "text-red-400" : "text-foreground";
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="border border-border rounded-sm bg-background min-w-0">
      <div className="px-4 py-3 border-b border-border">
        <div className="section-label">{title}</div>
        {subtitle && <div className="text-[11px] text-muted-foreground mt-1">{subtitle}</div>}
      </div>
      <div className="p-4 min-w-0">{children}</div>
    </section>
  );
}

function HeroMetric({
  label,
  value,
  caption,
  color,
}: {
  label: string;
  value: string;
  caption: string;
  color?: string;
}) {
  return (
    <div className="border border-border rounded-sm p-4 min-h-[104px] flex flex-col justify-between">
      <div className="section-label">{label}</div>
      <div>
        <div className={`font-mono text-2xl font-semibold tracking-tight ${color ?? "text-foreground"}`}>{value}</div>
        <div className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{caption}</div>
      </div>
    </div>
  );
}

function MetricRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/70 py-2.5 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`font-mono text-xs font-semibold ${color ?? "text-foreground"}`}>{value}</span>
    </div>
  );
}

function Empty({ height = 220 }: { height?: number }) {
  return (
    <div className="flex items-center justify-center text-xs text-muted-foreground" style={{ height }}>
      Close trades to see this analysis
    </div>
  );
}

function setupAnalytics(closed: Trade[]) {
  const bySetup: Record<string, { wins: number; losses: number; pnlUsd: number; total: number }> = {};
  for (const trade of closed) {
    if (!bySetup[trade.setupType]) bySetup[trade.setupType] = { wins: 0, losses: 0, pnlUsd: 0, total: 0 };
    bySetup[trade.setupType].total++;
    bySetup[trade.setupType].pnlUsd += tradeRealizedUsd(trade);
    if (trade.outcome === "win") bySetup[trade.setupType].wins++;
    if (trade.outcome === "loss") bySetup[trade.setupType].losses++;
  }

  return Object.entries(bySetup)
    .map(([setup, data]) => {
      const decided = data.wins + data.losses;
      return {
        setup,
        name: setup.replace(" Retest", " R.").replace(" Bottom", " Bot.").replace("Trendline ", "TL "),
        winRate: decided > 0 ? Math.round((data.wins / decided) * 100) : 0,
        pnlUsd: Math.round(data.pnlUsd * 100) / 100,
        count: data.total,
      };
    })
    .sort((a, b) => b.pnlUsd - a.pnlUsd);
}

export default function Analytics() {
  const { trades } = useTrades();
  const { settings } = useSettings();
  const { adjustments } = useCapitalAdjustments();

  const closed = trades.filter((t) => t.outcome && t.actualPnlPct != null);
  const wins = closed.filter(isWinningClosed);
  const losses = closed.filter(isLosingClosed);
  const breakevens = closed.filter(isBreakevenClosed);
  const decided = wins.length + losses.length;

  const winRate = decided > 0 ? (wins.length / decided) * 100 : 0;
  const totalPnlUsd = totalRealizedUsd(closed);
  const adjustmentsUsd = totalCapitalAdjustmentsUsd(adjustments);
  const equityStartUsd = initialCapitalUsd(settings.totalCapital, totalPnlUsd, adjustmentsUsd);
  const accountReturn = accountReturnPct(equityStartUsd, totalPnlUsd);
  const tradingReturn = totalTradingReturnPct(closed);
  const avgWinPct = avg(wins.map((t) => Math.abs(t.actualPnlPct ?? 0)));
  const avgLossPct = avg(losses.map((t) => Math.abs(t.actualPnlPct ?? 0)));
  const avgRr = avg(closed.map((t) => t.suggestedRr ?? 0).filter((value) => value > 0));
  const avgCapitalRiskPct = avg(
    closed
      .map((t) => ((t.suggestedAllocationPct ?? 0) * (t.suggestedSlPct ?? t.stopLossPct ?? 0)) / 100)
      .filter((value) => value > 0),
  );
  const expectancyPct = decided > 0
    ? (wins.length / decided) * avgWinPct - (losses.length / decided) * avgLossPct
    : 0;
  const expectancyUsd = avg(closed.map((t) => tradeRealizedUsd(t)));
  const profitFactor = Math.abs(losses.reduce((sum, t) => sum + tradeRealizedUsd(t), 0)) > 0
    ? wins.reduce((sum, t) => sum + tradeRealizedUsd(t), 0) / Math.abs(losses.reduce((sum, t) => sum + tradeRealizedUsd(t), 0))
    : wins.length > 0
      ? Infinity
      : 0;

  const closedChrono = [...closed].sort(
    (a, b) => new Date(a.closedAt ?? a.createdAt).getTime() - new Date(b.closedAt ?? b.createdAt).getTime(),
  );
  const netPnlCurve = buildNetPnlCurveUsd(closedChrono);
  const returnCurve = buildTradingReturnPctCurve(closedChrono);
  const setupData = setupAnalytics(closed);
  const setupBarProps = chartBarXAxisProps(setupData.length);

  const mistakeFreq: Record<string, number> = {};
  for (const trade of trades) {
    for (const tag of tagList(trade.mistakeTags)) {
      mistakeFreq[tag] = (mistakeFreq[tag] ?? 0) + 1;
    }
  }
  const mistakes = Object.entries(mistakeFreq)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return (
    <div className="p-6 space-y-6 w-full min-w-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold">Analytics</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Performance summary for {closed.length} closed trades
          </p>
        </div>
        <CapitalSummary />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <HeroMetric
          label="Expectancy"
          value={fmtPct(expectancyPct, true)}
          caption={`${fmtUsd(expectancyUsd)} average realized PnL per closed trade`}
          color={tone(expectancyPct)}
        />
        <HeroMetric
          label="Net PnL"
          value={fmtUsd(totalPnlUsd)}
          caption={`${fmtPct(accountReturn, true)} account return from realized trades`}
          color={tone(totalPnlUsd)}
        />
        <HeroMetric
          label="Win Rate"
          value={`${winRate.toFixed(1)}%`}
          caption={`${wins.length} wins / ${losses.length} losses / ${breakevens.length} breakeven`}
          color={winRate >= 50 && decided > 0 ? "text-green-400" : decided > 0 ? "text-red-400" : undefined}
        />
        <HeroMetric
          label="Profit Factor"
          value={profitFactor === Infinity ? "∞" : profitFactor.toFixed(2)}
          caption="Gross win dollars divided by gross loss dollars"
          color={profitFactor >= 1.5 ? "text-green-400" : profitFactor > 0 && profitFactor < 1 ? "text-red-400" : undefined}
        />
      </div>

      <div className="grid grid-cols-1 2xl:grid-cols-[1.45fr_0.9fr] gap-4">
        <Panel title="Net PnL Curve" subtitle="Cumulative realized dollars from closed trades only">
          {netPnlCurve.length > 1 ? (
            <PerformanceAreaChart
              data={netPnlCurve}
              dataKey="pnlUsd"
              height={300}
              yTickFormatter={(v) => `${Number(v) >= 0 ? "+" : "-"}$${Math.abs(Number(v)).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              tooltipFormatter={(v) => [`${Number(v) >= 0 ? "+" : "-"}$${Math.abs(Number(v)).toFixed(2)}`, "Net PnL"]}
            />
          ) : (
            <Empty height={300} />
          )}
        </Panel>

        <Panel title="Performance Profile" subtitle="Core averages and execution quality">
          <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-1 gap-x-6">
            <MetricRow label="Trading return sum" value={fmtPct(tradingReturn, true)} color={tone(tradingReturn)} />
            <MetricRow label="Average win" value={`+${avgWinPct.toFixed(2)}%`} color="text-green-400" />
            <MetricRow label="Average loss" value={`-${avgLossPct.toFixed(2)}%`} color="text-red-400" />
            <MetricRow label="Average RR" value={avgRr > 0 ? `${avgRr.toFixed(2)}:1` : "-"} />
            <MetricRow label="Average capital risk" value={`${avgCapitalRiskPct.toFixed(2)}%`} />
            <MetricRow label="Closed sample" value={`${closed.length} trades`} />
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title="Return Curve" subtitle="Cumulative trade-result percent, independent from capital sizing">
          {returnCurve.length > 1 ? (
            <PerformanceAreaChart
              data={returnCurve}
              dataKey="returnPct"
              height={220}
              stroke="hsl(0 0% 85%)"
              strokeWidth={1.2}
              yTickFormatter={(v) => `${Number(v).toFixed(0)}%`}
              tooltipFormatter={(v) => [`${Number(v).toFixed(2)}%`, "Trading Return"]}
            />
          ) : (
            <Empty height={220} />
          )}
        </Panel>

        <Panel title="Setup Performance" subtitle="Win rate by setup type, sorted by realized PnL">
          {setupData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={setupData} margin={{ ...CHART_MARGIN, left: -18 }}>
                <XAxis {...setupBarProps} />
                <YAxis
                  tick={{ fontSize: 9, fill: "hsl(0 0% 35%)", fontFamily: "var(--app-font-mono)" }}
                  axisLine={false}
                  tickLine={false}
                  unit="%"
                  width={34}
                />
                <Tooltip {...TT} formatter={(v) => [`${v}%`, "Win Rate"]} />
                <Bar dataKey="winRate" radius={[2, 2, 0, 0]}>
                  {setupData.map((entry) => (
                    <Cell key={entry.setup} fill={entry.winRate >= 50 ? "hsl(142 71% 45%)" : "hsl(0 72% 51%)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Empty height={220} />
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title="Best / Worst Setups" subtitle="Realized dollars by setup type">
          {setupData.length > 0 ? (
            <div className="space-y-2">
              {setupData.map((setup) => (
                <div key={setup.setup} className="grid grid-cols-[1fr_80px_80px] gap-3 items-center text-xs font-mono border-b border-border/70 pb-2 last:border-0 last:pb-0">
                  <span className="text-foreground truncate">{setup.setup}</span>
                  <span className="text-muted-foreground text-right">{setup.count} trades</span>
                  <span className={`text-right ${tone(setup.pnlUsd)}`}>{fmtUsd(setup.pnlUsd)}</span>
                </div>
              ))}
            </div>
          ) : (
            <Empty height={140} />
          )}
        </Panel>

        <Panel title="Mistake Frequency" subtitle="Most common tagged execution errors">
          {mistakes.length > 0 ? (
            <div className="space-y-3">
              {mistakes.map(({ tag, count }) => (
                <div key={tag} className="grid grid-cols-[150px_1fr_24px] gap-3 items-center">
                  <span className="font-mono text-xs text-muted-foreground truncate">{tag}</span>
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-400/70 rounded-full"
                      style={{ width: `${(count / mistakes[0].count) * 100}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs text-muted-foreground text-right">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <Empty height={140} />
          )}
        </Panel>
      </div>
    </div>
  );
}
