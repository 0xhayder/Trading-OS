import { useTrades } from "@/lib/store";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";

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
    <div className="border border-border rounded-sm p-4">
      <div className="section-label mb-4">{title}</div>
      {children}
    </div>
  );
}

function Empty() {
  return (
    <div className="h-36 flex items-center justify-center text-xs text-muted-foreground">
      Close trades to see data
    </div>
  );
}

export default function Analytics() {
  const { trades } = useTrades();
  const closed = trades.filter((t) => t.outcome && t.actualPnlPct != null);

  const wins = closed.filter((t) => (t.actualPnlPct ?? 0) > 0);
  const losses = closed.filter((t) => (t.actualPnlPct ?? 0) <= 0);
  const winRate = closed.length > 0 ? Math.round((wins.length / closed.length) * 100) : 0;
  const totalPnl = closed.reduce((s, t) => s + (t.actualPnlPct ?? 0), 0);

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

  const bySetup: Record<string, { wins: number; total: number }> = {};
  for (const t of closed) {
    if (!bySetup[t.setupType]) bySetup[t.setupType] = { wins: 0, total: 0 };
    bySetup[t.setupType].total++;
    if ((t.actualPnlPct ?? 0) > 0) bySetup[t.setupType].wins++;
  }
  const setupData = Object.entries(bySetup).map(([k, v]) => ({
    name: k.replace(" Retest", " R.").replace(" Bottom", " Bot.").replace("Trendline ", "TL "),
    wr: Math.round((v.wins / v.total) * 100),
  }));

  const mistakeFreq: Record<string, number> = {};
  for (const t of trades) {
    if (!t.mistakeTags) continue;
    for (const tag of t.mistakeTags.split(",").map((s) => s.trim()).filter(Boolean)) {
      mistakeFreq[tag] = (mistakeFreq[tag] ?? 0) + 1;
    }
  }
  const mistakeData = Object.entries(mistakeFreq)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-sm font-semibold">Analytics</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{closed.length} closed trades</p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Closed", value: String(closed.length) },
          { label: "Win Rate", value: `${winRate}%`, color: winRate >= 50 && closed.length > 0 ? "text-green-400" : closed.length > 0 ? "text-red-400" : undefined },
          { label: "Total PnL", value: `${totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}%`, color: totalPnl > 0 ? "text-green-400" : totalPnl < 0 ? "text-red-400" : undefined },
          { label: "W / L", value: `${wins.length} / ${losses.length}` },
        ].map(({ label, value, color }) => (
          <div key={label} className="border border-border rounded-sm p-4">
            <div className="section-label mb-2">{label}</div>
            <div className={`font-mono text-xl font-semibold ${color ?? "text-foreground"}`}>{value}</div>
          </div>
        ))}
      </div>

      <Section title="Equity Curve">
        {equityCurve.length > 1 ? (
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={equityCurve} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(0 0% 70%)" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="hsl(0 0% 70%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(0 0% 35%)", fontFamily: "var(--app-font-mono)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(0 0% 35%)", fontFamily: "var(--app-font-mono)" }} axisLine={false} tickLine={false} />
              <Tooltip {...TT} />
              <Area type="monotone" dataKey="equity" stroke="hsl(0 0% 70%)" strokeWidth={1.5} fill="url(#ag)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : <Empty />}
      </Section>

      <Section title="Win Rate by Setup">
        {setupData.length > 0 ? (
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={setupData} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(0 0% 35%)", fontFamily: "var(--app-font-mono)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "hsl(0 0% 35%)", fontFamily: "var(--app-font-mono)" }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip {...TT} formatter={(v) => [`${v}%`, "Win Rate"]} />
              <Bar dataKey="wr" radius={[2, 2, 0, 0]}>
                {setupData.map((e, i) => (
                  <Cell key={i} fill={e.wr >= 50 ? "hsl(142 71% 45%)" : "hsl(0 72% 51%)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : <Empty />}
      </Section>

      {mistakeData.length > 0 && (
        <Section title="Mistake Frequency">
          <div className="space-y-2">
            {mistakeData.map(({ tag, count }) => (
              <div key={tag} className="flex items-center gap-3">
                <span className="font-mono text-xs text-muted-foreground w-36 truncate">{tag}</span>
                <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-400/60 rounded-full"
                    style={{ width: `${(count / mistakeData[0].count) * 100}%` }}
                  />
                </div>
                <span className="font-mono text-xs text-muted-foreground w-4 text-right">{count}</span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
