import { useGetDashboard, useGetEquityCurve, getGetDashboardQueryKey, getGetEquityCurveQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboard();
  const { data: equityData, isLoading: equityLoading } = useGetEquityCurve();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-mono uppercase tracking-wider">Dashboard</h1>
      
      {statsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="py-2"><CardTitle className="text-xs font-mono text-muted-foreground uppercase">Capital</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-mono">${stats.totalCapital.toLocaleString()}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="py-2"><CardTitle className="text-xs font-mono text-muted-foreground uppercase">Total PNL</CardTitle></CardHeader>
            <CardContent><div className={`text-2xl font-mono ${stats.totalPnlPct >= 0 ? "text-green-500" : "text-destructive"}`}>{stats.totalPnlPct > 0 ? "+" : ""}{stats.totalPnlPct.toFixed(2)}%</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="py-2"><CardTitle className="text-xs font-mono text-muted-foreground uppercase">Win Rate</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-mono">{(stats.winRate * 100).toFixed(1)}%</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="py-2"><CardTitle className="text-xs font-mono text-muted-foreground uppercase">Avg RR</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-mono">{stats.avgRr.toFixed(2)}R</div></CardContent>
          </Card>
        </div>
      ) : null}

      <Card>
        <CardHeader><CardTitle className="text-sm font-mono uppercase">Equity Curve</CardTitle></CardHeader>
        <CardContent className="h-72">
          {equityLoading ? <Skeleton className="w-full h-full" /> : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={equityData || []}>
                <XAxis dataKey="date" stroke="#666" tickFormatter={(v) => format(new Date(v), "MMM d")} />
                <YAxis stroke="#666" domain={["auto", "auto"]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#111", border: "1px solid #222" }}
                  itemStyle={{ color: "#fff", fontFamily: "monospace" }}
                  labelStyle={{ color: "#888", fontFamily: "monospace" }}
                />
                <Line type="stepAfter" dataKey="equity" stroke="#fff" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm font-mono uppercase">Recent Trades</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Coin</TableHead>
                <TableHead>Setup</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">PNL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats?.recentTrades.map((trade) => (
                <TableRow key={trade.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{format(new Date(trade.createdAt), "MMM d, HH:mm")}</TableCell>
                  <TableCell className="font-mono">{trade.coin}</TableCell>
                  <TableCell className="text-xs">{trade.setupType}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`font-mono uppercase ${trade.status === "WIN" ? "text-green-500 border-green-500/20" : trade.status === "LOSS" ? "text-destructive border-destructive/20" : "text-muted-foreground"}`}>
                      {trade.status}
                    </Badge>
                  </TableCell>
                  <TableCell className={`text-right font-mono ${trade.actualPnlPct && trade.actualPnlPct >= 0 ? "text-green-500" : trade.actualPnlPct && trade.actualPnlPct < 0 ? "text-destructive" : ""}`}>
                    {trade.actualPnlPct != null ? `${trade.actualPnlPct > 0 ? "+" : ""}${trade.actualPnlPct}%` : "-"}
                  </TableCell>
                </TableRow>
              ))}
              {!stats?.recentTrades.length && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-4">No recent trades.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
