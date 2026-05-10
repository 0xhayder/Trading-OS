import { useTrades } from "@/lib/store";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  ResponsiveContainer, Tooltip, Cell
} from "recharts";

const TT_STYLE = {
  contentStyle: {
    background: "hsl(0 0% 8%)",
    border: "1px solid hsl(0 0% 14%)",
    borderRadius: "2px",
    fontSize: "11px",
    fontFamily: "var(--app-font-mono)",
    color: "hsl(0 0% 90%)",
  },
  itemStyle: { color: "hsl(0 0% 90%)" },
  labelStyle: { color: "hsl(0 0% 45%)" },
};

export default function Analytics() {
  const { trades } = useTrades();
  const closed = trades.filter((t) => t.outcome && t.actualPnlPct != null);

  let equity = 100;
  const equityCurve = [...closed]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((t) => {
      equity += t.actualPnlPct ?? 0;
      return {
        date: new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        equity: Math.round(equity * 100) / 100,
      };
    });

  const bySetup: Record<string, { wins: number; total: number; pnl: number }> = {};
  for (const t of closed) {
    if (!bySetup[t.setupType]) bySetup[t.setupType] = { wins: 0, total: 0, pnl: 0 };
    bySetup[t.setupType].total++;
    bySetup[t.setupType].pnl += t.actualPnlPct ?? 0;
    if ((t.actualPnlPct ?? 0) > 0) bySetup[t.setupType].wins++;
  }
  const setupData = Object.entries(bySetup).map(([setup, d]) => ({
    setup: setup.replace(" Trade", "").replace(" Retest", " R.").replace(" Bottom", " Bot."),
    winRate: Math.round((d.wins / d.total) * 100),
    pnl: Math.round(d.pnl * 10) / 10,
  }));

  const byCoin: Record<string, { wins: number; total: number; pnl: number }> = {};
  for (const t of closed) {
    const key = t.coin.split("/")[0];
    if (!byCoin[key]) byCoin[key] = { wins: 0, total: 0, pnl: 0 };
    byCoin[key].total++;
    byCoin[key].pnl += t.actualPnlPct ?? 0;
    if ((t.actualPnlPct ?? 0) > 0) byCoin[key].wins++;
  }
  const coinData = Object.entries(byCoin)
    .map(([coin, d]) => ({ coin, pnl: Math.round(d.pnl * 10) / 10, winRate: Math.round((d.wins / d.total) * 100) }))
    .sort((a, b) => b.pnl - a.pnl);

  const mistakeFreq: Record<string, number> = {};
  for (const t of trades) {
    if (!t.mistakeTags) continue;
    for (const tag of t.mistakeTags.split(",").map((s) => s.trim())) {
      if (tag) mistakeFreq[tag] = (mistakeFreq[tag] ?? 0) + 1;
    }
  }
  const mistakeData = Object.entries(mistakeFreq)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);

  const totalWins = closed.filter((t) => (t.actualPnlPct ?? 0) > 0).length;
  const totalLoss = closed.filter((t) => (t.actualPnlPct ?? 0) <= 0).length;
  const winRate = closed.length > 0 ? Math.round((totalWins / closed.length) * 100) : 0;
  const totalPnl = closed.reduce((s, t) => s + (t.actualPnlPct ?? 0), 0);

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="border border-border bg-card rounded-sm p-4">
      <div className="section-label mb-4">{title}</div>
      {children}
    </div>
  );

  const EmptyState = () => (
    <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
      Complete trades to see analytics
    </div>
  );

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-base font-semibold tracking-tight">Analytics</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Performance breakdown — {closed.length} closed trades</p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Closed Trades", value: String(closed.length) },
          { label: "Win Rate", value: `${winRate}%`, color: winRate >= 50 ? "text-green-400" : "text-red-400" },
          { label: "Total PnL", value: `${totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}%`, color: totalPnl >= 0 ? "text-green-400" : "text-red-400" },
          { label: "W / L", value: `${totalWins} / ${totalLoss}` },
        ].map(({ label, value, color }) => (
          <div key={label} className="border border-border bg-card p-4 rounded-sm">
            <div className="section-label mb-2">{label}</div>
            <div className={`font-mono text-2xl font-semibold ${color ?? "text-foreground"}`}>{value}</div>
          </div>
        ))}
      </div>

      <Section title="Equity Curve">
        {equityCurve.length > 1 ? (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={equityCurve} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
              <defs>
                <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(0 0% 80%)" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="hsl(0 0% 80%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(0 0% 35%)", fontFamily: "var(--app-font-mono)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(0 0% 35%)", fontFamily: "var(--app-font-mono)" }} axisLine={false} tickLine={false} />
              <Tooltip {...TT_STYLE} />
              <Area type="monotone" dataKey="equity" stroke="hsl(0 0% 80%)" strokeWidth={1.5} fill="url(#ag)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : <EmptyState />}
      </Section>

      <div className="grid grid-cols-2 gap-4">
        <Section title="Win Rate by Setup">
          {setupData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={setupData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                <XAxis dataKey="setup" tick={{ fontSize: 9, fill: "hsl(0 0% 35%)", fontFamily: "var(--app-font-mono)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "hsl(0 0% 35%)", fontFamily: "var(--app-font-mono)" }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip {...TT_STYLE} formatter={(v) => [`${v}%`, "Win Rate"]} />
                <Bar dataKey="winRate" radius={[2, 2, 0, 0]}>
                  {setupData.map((entry, i) => (
                    <Cell key={i} fill={entry.winRate >= 50 ? "hsl(142 71% 45%)" : "hsl(0 72% 51%)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState />}
        </Section>

        <Section title="PnL by Coin">
          {coinData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={coinData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                <XAxis dataKey="coin" tick={{ fontSize: 9, fill: "hsl(0 0% 35%)", fontFamily: "var(--app-font-mono)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "hsl(0 0% 35%)", fontFamily: "var(--app-font-mono)" }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip {...TT_STYLE} formatter={(v) => [`${v}%`, "PnL"]} />
                <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>
                  {coinData.map((entry, i) => (
                    <Cell key={i} fill={entry.pnl >= 0 ? "hsl(0 0% 70%)" : "hsl(0 72% 51%)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState />}
        </Section>
      </div>

      {mistakeData.length > 0 && (
        <Section title="Mistake Frequency">
          <div className="space-y-2">
            {mistakeData.map(({ tag, count }) => (
              <div key={tag} className="flex items-center gap-3">
                <div className="font-mono text-xs text-muted-foreground w-32 truncate">{tag}</div>
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-400/70 rounded-full"
                    style={{ width: `${(count / mistakeData[0].count) * 100}%` }}
                  />
                </div>
                <div className="font-mono text-xs text-muted-foreground w-4 text-right">{count}</div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
