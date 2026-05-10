import { Link } from "wouter";
import { useTrades } from "@/lib/store";
import { useSettings } from "@/lib/store";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

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

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="border border-border p-4 rounded-sm">
      <div className="section-label mb-2">{label}</div>
      <div className={`font-mono text-xl font-semibold ${color ?? "text-foreground"}`}>{value}</div>
    </div>
  );
}

export default function Dashboard() {
  const { trades } = useTrades();
  const { settings } = useSettings();

  const closed = trades.filter((t) => t.outcome && t.actualPnlPct != null);
  const open = trades.filter((t) => !t.outcome);
  const wins = closed.filter((t) => (t.actualPnlPct ?? 0) > 0);
  const totalPnl = closed.reduce((s, t) => s + (t.actualPnlPct ?? 0), 0);
  const winRate = closed.length > 0 ? (wins.length / closed.length) * 100 : 0;

  let eq = 100;
  const equityCurve = [...closed]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((t) => {
      eq += t.actualPnlPct ?? 0;
      return {
        date: new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        equity: Math.round(eq * 100) / 100,
      };
    });

  const recent = [...trades]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  const statusColor: Record<string, string> = {
    "Expansion Trade": "text-green-400",
    "High Conviction": "text-green-400",
    "Standard Trade": "text-foreground/70",
    "Watchlist": "text-yellow-500",
    "Reject": "text-red-400",
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-semibold">Dashboard</h1>
        <span className="font-mono text-xs text-muted-foreground">
          Capital: ${settings.totalCapital.toLocaleString()}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Stat
          label="Total PnL"
          value={`${totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}%`}
          color={totalPnl > 0 ? "text-green-400" : totalPnl < 0 ? "text-red-400" : undefined}
        />
        <Stat
          label="Win Rate"
          value={`${winRate.toFixed(1)}%`}
          color={winRate >= 50 ? "text-green-400" : closed.length > 0 ? "text-red-400" : undefined}
        />
        <Stat label="Closed" value={`${wins.length}W / ${closed.length - wins.length}L`} />
        <Stat label="Open" value={String(open.length)} />
      </div>

      <div className="border border-border rounded-sm p-4">
        <div className="section-label mb-4">Equity Curve</div>
        {equityCurve.length > 1 ? (
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={equityCurve} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(0 0% 70%)" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="hsl(0 0% 70%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(0 0% 35%)", fontFamily: "var(--app-font-mono)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(0 0% 35%)", fontFamily: "var(--app-font-mono)" }} axisLine={false} tickLine={false} />
              <Tooltip {...TT} />
              <Area type="monotone" dataKey="equity" stroke="hsl(0 0% 70%)" strokeWidth={1.5} fill="url(#eg)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-40 flex items-center justify-center text-xs text-muted-foreground">
            Close trades to build the equity curve
          </div>
        )}
      </div>

      <div className="border border-border rounded-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
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
                      : "bg-yellow-500"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-mono font-medium">{t.coin}</span>
                    <span className="text-muted-foreground text-xs">{t.setupType}</span>
                    <span className="text-muted-foreground text-xs">· {t.timeframe}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                    {new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-xs font-mono ${statusColor[t.tradeStatus] ?? ""}`}>{t.tradeStatus}</div>
                  <div className="text-[10px] font-mono text-muted-foreground">{t.finalScore}/100</div>
                </div>
                {t.actualPnlPct != null && (
                  <div className={`font-mono text-sm w-14 text-right shrink-0 ${t.actualPnlPct >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {t.actualPnlPct >= 0 ? "+" : ""}{t.actualPnlPct.toFixed(2)}%
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
