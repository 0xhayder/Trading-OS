import { useCapitalAdjustments, useSettings, useTrades } from "@/lib/store";
import CapitalSummary from "@/components/CapitalSummary";
import {
  accountReturnPct,
  buildEquityCurveUsd,
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
import { CHART_MARGIN, chartBarXAxisProps } from "@/lib/chartAxis";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";

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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-border rounded-sm p-3 min-w-0">
      <div className="section-label mb-2">{title}</div>
      {children}
    </div>
  );
}

function Empty() {
  return (
    <div className="h-[160px] flex items-center justify-center text-xs text-muted-foreground">
      Close trades to see data
    </div>
  );
}

function tagList(tags: unknown): string[] {
  if (Array.isArray(tags)) return tags.filter((tag): tag is string => typeof tag === "string");
  if (typeof tags === "string") return tags.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
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
  const winRate = decided > 0 ? Math.round((wins.length / decided) * 100) : 0;
  const totalPnlUsd = totalRealizedUsd(closed);
  const adjustmentsUsd = totalCapitalAdjustmentsUsd(adjustments);
  const equityStartUsd = initialCapitalUsd(settings.totalCapital, totalPnlUsd, adjustmentsUsd);
  const accountReturn = accountReturnPct(equityStartUsd, totalPnlUsd);
  const tradingReturn = totalTradingReturnPct(closed);

  const closedChrono = [...closed].sort(
    (a, b) => new Date(a.closedAt ?? a.createdAt).getTime() - new Date(b.closedAt ?? b.createdAt).getTime(),
  );
  const tradingCurve = buildEquityCurveUsd(closedChrono, equityStartUsd);
  const tradingReturnCurve = buildTradingReturnPctCurve(closedChrono);

  const bySetup: Record<string, { wins: number; losses: number }> = {};
  for (const t of closed) {
    if (!bySetup[t.setupType]) bySetup[t.setupType] = { wins: 0, losses: 0 };
    if (t.outcome === "win") bySetup[t.setupType].wins++;
    if (t.outcome === "loss") bySetup[t.setupType].losses++;
  }
  const setupData = Object.entries(bySetup).map(([k, v]) => {
    const d = v.wins + v.losses;
    return {
      name: k.replace(" Retest", " R.").replace(" Bottom", " Bot.").replace("Trendline ", "TL "),
      wr: d > 0 ? Math.round((v.wins / d) * 100) : 0,
    };
  });

  const mistakeFreq: Record<string, number> = {};
  for (const t of trades) {
    for (const tag of tagList(t.mistakeTags)) {
      mistakeFreq[tag] = (mistakeFreq[tag] ?? 0) + 1;
    }
  }
  const mistakeData = Object.entries(mistakeFreq)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);

  const pctColor = (v: number) => (v > 0 ? "text-green-400" : v < 0 ? "text-red-400" : undefined);
  const barXProps = chartBarXAxisProps(setupData.length);

  return (
    <div className="p-6 space-y-4 w-full min-w-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold">Analytics</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {closed.length} closed trades
          </p>
        </div>
        <CapitalSummary />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2">
        <StatCard label="Account Return" value={`${accountReturn >= 0 ? "+" : ""}${accountReturn.toFixed(2)}%`} color={pctColor(accountReturn)} />
        <StatCard label="Total PnL" value={`${totalPnlUsd >= 0 ? "+" : ""}$${totalPnlUsd.toFixed(2)}`} color={pctColor(totalPnlUsd)} />
        <StatCard label="Trading Return" value={`${tradingReturn >= 0 ? "+" : ""}${tradingReturn.toFixed(2)}%`} color={pctColor(tradingReturn)} />
        <StatCard
          label="Win Rate"
          value={`${winRate}%`}
          color={winRate >= 50 && closed.length > 0 ? "text-green-400" : closed.length > 0 ? "text-red-400" : undefined}
        />
        <StatCard label="W / L / BE" value={`${wins.length}/${losses.length}${breakevens.length ? `/${breakevens.length}` : ""}`} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <Section title="Trading equity curve">
          {tradingCurve.length > 1 ? (
            <PerformanceAreaChart
              data={tradingCurve}
              dataKey="equityUsd"
              yTickFormatter={(v) => `$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              tooltipFormatter={(v) => [`$${Number(v).toFixed(2)}`, "Trading Equity"]}
            />
          ) : (
            <Empty />
          )}
        </Section>

        <Section title="Trading return %">
          {tradingReturnCurve.length > 1 ? (
            <PerformanceAreaChart
              data={tradingReturnCurve}
              dataKey="returnPct"
              stroke="hsl(0 0% 85%)"
              strokeWidth={1.2}
              yTickFormatter={(v) => `${Number(v).toFixed(0)}%`}
              tooltipFormatter={(v) => [`${Number(v).toFixed(2)}%`, "Trading Return"]}
            />
          ) : (
            <Empty />
          )}
        </Section>
      </div>

      <Section title="Win Rate by Setup">
        {setupData.length > 0 ? (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={setupData} margin={{ ...CHART_MARGIN, left: -20 }}>
              <XAxis {...barXProps} />
              <YAxis tick={{ fontSize: 9, fill: "hsl(0 0% 35%)", fontFamily: "var(--app-font-mono)" }} axisLine={false} tickLine={false} unit="%" width={36} />
              <Tooltip {...TT} formatter={(v) => [`${v}%`, "Win Rate"]} />
              <Bar dataKey="wr" radius={[2, 2, 0, 0]}>
                {setupData.map((e, i) => (
                  <Cell key={i} fill={e.wr >= 50 ? "hsl(142 71% 45%)" : "hsl(0 72% 51%)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Empty />
        )}
      </Section>

      {mistakeData.length > 0 && (
        <Section title="Mistake Frequency">
          <div className="space-y-2">
            {mistakeData.map(({ tag, count }) => (
              <div key={tag} className="flex items-center gap-3 min-w-0">
                <span className="font-mono text-xs text-muted-foreground w-36 sm:w-44 truncate shrink-0">{tag}</span>
                <div className="flex-1 min-w-0 h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-400/60 rounded-full"
                    style={{ width: `${(count / mistakeData[0].count) * 100}%` }}
                  />
                </div>
                <span className="font-mono text-xs text-muted-foreground w-4 text-right shrink-0">{count}</span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
