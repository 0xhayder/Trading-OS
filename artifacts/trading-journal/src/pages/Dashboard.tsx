import { useTrades } from "@/lib/store";
import { useSettings } from "@/lib/store";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { TrendingUp, TrendingDown, Activity, Target, BarChart2, Circle } from "lucide-react";

function StatCard({ label, value, sub, positive }: { label: string; value: string; sub?: string; positive?: boolean }) {
  return (
    <div className="border border-border bg-card p-4 rounded-sm">
      <div className="section-label mb-2">{label}</div>
      <div className={`font-mono text-2xl font-semibold ${positive === true ? "text-green-400" : positive === false ? "text-red-400" : "text-foreground"}`}>
        {value}
      </div>
      {sub && <div className="text-xs text-muted-foreground mt-1 font-mono">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { trades } = useTrades();
  const { settings } = useSettings();

  const closed = trades.filter((t) => t.outcome && t.actualPnlPct != null);
  const wins = closed.filter((t) => (t.actualPnlPct ?? 0) > 0);
  const open = trades.filter((t) => t.status === "open");
  const winRate = closed.length > 0 ? (wins.length / closed.length) * 100 : 0;
  const totalPnl = closed.reduce((s, t) => s + (t.actualPnlPct ?? 0), 0);
  const avgRr = closed.length > 0 ? closed.reduce((s, t) => s + t.suggestedRr, 0) / closed.length : 0;

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

  const recent = [...trades]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  const statusColor: Record<string, string> = {
    "Expansion Trade": "text-green-400",
    "High Conviction": "text-green-400",
    "Standard Trade": "text-foreground",
    "Watchlist": "text-yellow-500",
    "Reject": "text-red-400",
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold tracking-tight">Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Portfolio overview &amp; recent activity</p>
        </div>
        <div className="text-xs font-mono text-muted-foreground border border-border px-3 py-1.5 rounded-sm">
          Capital: <span className="text-foreground">${settings.totalCapital.toLocaleString()}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total PnL"
          value={`${totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}%`}
          sub={`$${((totalPnl / 100) * settings.totalCapital).toFixed(0)} realized`}
          positive={totalPnl >= 0}
        />
        <StatCard
          label="Win Rate"
          value={`${winRate.toFixed(1)}%`}
          sub={`${wins.length}W / ${closed.length - wins.length}L of ${closed.length}`}
          positive={winRate >= 50}
        />
        <StatCard label="Avg RR" value={`${avgRr.toFixed(2)}:1`} sub="risk/reward ratio" />
        <StatCard
          label="Open Trades"
          value={String(open.length)}
          sub={`${trades.length} total entries`}
        />
      </div>

      <div className="border border-border bg-card rounded-sm p-4">
        <div className="section-label mb-4">Equity Curve</div>
        {equityCurve.length > 1 ? (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={equityCurve} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
              <defs>
                <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(0 0% 93%)" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="hsl(0 0% 93%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "hsl(0 0% 35%)", fontFamily: "var(--app-font-mono)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(0 0% 35%)", fontFamily: "var(--app-font-mono)" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(0 0% 8%)",
                  border: "1px solid hsl(0 0% 14%)",
                  borderRadius: "2px",
                  fontSize: "11px",
                  fontFamily: "var(--app-font-mono)",
                  color: "hsl(0 0% 90%)",
                }}
                itemStyle={{ color: "hsl(0 0% 90%)" }}
                labelStyle={{ color: "hsl(0 0% 45%)" }}
              />
              <Area
                type="monotone"
                dataKey="equity"
                stroke="hsl(0 0% 80%)"
                strokeWidth={1.5}
                fill="url(#equityGrad)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
            Complete trades to build the equity curve
          </div>
        )}
      </div>

      <div className="border border-border bg-card rounded-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="section-label">Recent Trades</div>
          <div className="text-xs text-muted-foreground font-mono">{recent.length} entries</div>
        </div>
        <div className="divide-y divide-border">
          {recent.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">No trades yet</div>
          )}
          {recent.map((t) => (
            <div key={t.id} className="px-4 py-3 flex items-center gap-4">
              <Circle
                size={6}
                className={`shrink-0 fill-current ${
                  t.status === "open"
                    ? "text-yellow-500"
                    : t.outcome === "win"
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium">{t.coin}</span>
                  <span className="text-xs text-muted-foreground">{t.setupType}</span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">{t.timeframe}</span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                  {new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className={`font-mono text-sm ${statusColor[t.tradeStatus]}`}>
                  {t.tradeStatus}
                </div>
                <div className="font-mono text-xs text-muted-foreground">
                  {t.finalScore}/100
                </div>
              </div>
              {t.actualPnlPct != null && (
                <div className={`font-mono text-sm w-16 text-right shrink-0 ${t.actualPnlPct >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {t.actualPnlPct >= 0 ? "+" : ""}{t.actualPnlPct.toFixed(2)}%
                </div>
              )}
              {t.status === "open" && (
                <div className="font-mono text-xs text-yellow-500 w-16 text-right shrink-0">OPEN</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
