import { Fragment, useState } from "react";
import { useSettings, useTrades } from "@/lib/store";
import { Trash2, ChevronUp, ChevronDown } from "lucide-react";
import type { Trade, TradeOutcome } from "@/lib/types";
import { formatTradeDateShort, formatTradeDateTime, formatTradeTimeOnly } from "@/lib/formatDates";

type SortKey = "createdAt" | "finalScore" | "actualPnlPct";

export default function Journal() {
  const { trades, deleteTrade, updateTrade } = useTrades();
  const { refreshSettings } = useSettings();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editOutcome, setEditOutcome] = useState<TradeOutcome | "">("");
  const [editPnl, setEditPnl] = useState("");
  const [editAllocatedAmount, setEditAllocatedAmount] = useState("");
  const [editMistakes, setEditMistakes] = useState("");

  const filtered = trades
    .filter((t) => {
      const q = search.toLowerCase();
      if (q && !t.coin.toLowerCase().includes(q) && !t.setupType.toLowerCase().includes(q)) return false;
      if (filter === "open" && t.outcome) return false;
      if (filter === "win" && t.outcome !== "win") return false;
      if (filter === "loss" && t.outcome !== "loss") return false;
      if (filter === "breakeven" && t.outcome !== "breakeven") return false;
      return true;
    })
    .sort((a, b) => {
      const av = sortKey === "createdAt" ? new Date(a.createdAt).getTime() : (a[sortKey] ?? 0);
      const bv = sortKey === "createdAt" ? new Date(b.createdAt).getTime() : (b[sortKey] ?? 0);
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("desc"); }
  };

  const openExpand = (t: Trade) => {
    setExpandedId(t.id);
    setEditOutcome(t.outcome ?? "");
    setEditPnl(t.actualPnlPct != null ? String(t.actualPnlPct) : "");
    setEditAllocatedAmount(t.allocatedAmountUsd != null ? String(t.allocatedAmountUsd) : "");
    setEditMistakes(t.mistakeTags ?? "");
  };

  const saveExpand = () => {
    if (!expandedId) return;
    const pnl = parseFloat(editPnl);
    const allocatedAmount = parseFloat(editAllocatedAmount);

    // Capital is adjusted only on the API (trade PATCH); refreshing settings avoids double-counting
    // when the client would also PATCH settings with stale local totals.
    void updateTrade(expandedId, {
      outcome: editOutcome || undefined,
      actualPnlPct: isNaN(pnl) ? undefined : pnl,
      allocatedAmountUsd: isNaN(allocatedAmount) ? undefined : allocatedAmount,
      mistakeTags: editMistakes || undefined,
    }).then((remote) => {
      if (remote) void refreshSettings();
    });
    setExpandedId(null);
  };

  const SortBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <button
      className="flex items-center gap-1 section-label hover:text-muted-foreground/70"
      onClick={() => toggleSort(k)}
    >
      {label}
      {sortKey === k ? (sortDir === "asc" ? <ChevronUp size={9} /> : <ChevronDown size={9} />) : null}
    </button>
  );

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold">Journal</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{trades.length} total entries</p>
        </div>
      </div>

      <div className="flex gap-3">
        <input
          className="flex-1 max-w-xs bg-background border border-border rounded-sm px-3 py-1.5 text-sm font-mono text-foreground placeholder-muted-foreground focus:outline-none focus:border-ring"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="bg-background border border-border rounded-sm px-3 py-1.5 text-sm font-mono text-foreground focus:outline-none focus:border-ring"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All</option>
          <option value="open">Open</option>
          <option value="win">Win</option>
          <option value="loss">Loss</option>
          <option value="breakeven">Breakeven</option>
        </select>
      </div>

      <div className="border border-border rounded-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-accent/20">
              <th className="px-3 py-2.5 text-left"><SortBtn k="createdAt" label="Date" /></th>
              <th className="px-3 py-2.5 text-left section-label">Coin</th>
              <th className="px-3 py-2.5 text-left section-label">Setup</th>
              <th className="px-3 py-2.5 text-left section-label">TF</th>
              <th className="px-3 py-2.5 text-left"><SortBtn k="finalScore" label="Score" /></th>
              <th className="px-3 py-2.5 text-left section-label">Status</th>
              <th className="px-3 py-2.5 text-left"><SortBtn k="actualPnlPct" label="PnL" /></th>
              <th className="px-3 py-2.5 text-left section-label"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-xs text-muted-foreground">
                  No entries yet
                </td>
              </tr>
            )}
            {filtered.map((t) => (
              <Fragment key={t.id}>
                <tr
                  className="hover:bg-accent/20 cursor-pointer"
                  onClick={() => expandedId === t.id ? setExpandedId(null) : openExpand(t)}
                >
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground whitespace-nowrap">
                    <div>{formatTradeDateShort(t.createdAt)}</div>
                    <div className="text-[10px] text-muted-foreground/80">{formatTradeTimeOnly(t.createdAt)}</div>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-sm font-medium">{t.coin}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{t.setupType}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{t.timeframe}</td>
                  <td className="px-3 py-2.5 font-mono text-sm">{t.finalScore}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{t.tradeStatus}</td>
                  <td className="px-3 py-2.5 font-mono text-sm">
                    {t.actualPnlPct != null ? (
                      <span
                        className={
                          t.outcome === "breakeven" || t.actualPnlPct === 0
                            ? "text-muted-foreground"
                            : t.actualPnlPct > 0
                            ? "text-green-400"
                            : "text-red-400"
                        }
                      >
                        {t.actualPnlPct > 0 ? "+" : ""}{t.actualPnlPct.toFixed(2)}%
                      </span>
                    ) : (
                      <span className="text-xs text-yellow-500">Open</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      className="text-muted-foreground hover:text-red-400 transition-colors"
                      onClick={(e) => { e.stopPropagation(); deleteTrade(t.id); }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>

                {expandedId === t.id && (
                  <tr>
                    <td colSpan={8} className="px-4 py-4 bg-accent/10">
                      <div className="text-[11px] font-mono text-muted-foreground mb-3">
                        Logged: <span className="text-foreground/90">{formatTradeDateTime(t.createdAt)}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 max-w-lg">
                        <div>
                          <div className="section-label mb-1.5">Outcome</div>
                          <select
                            className="w-full bg-background border border-border rounded-sm px-3 py-1.5 text-sm font-mono text-foreground focus:outline-none"
                            value={editOutcome}
                            onChange={(e) => setEditOutcome(e.target.value as TradeOutcome | "")}
                          >
                            <option value="">Open</option>
                            <option value="win">Win</option>
                            <option value="loss">Loss</option>
                            <option value="breakeven">Breakeven</option>
                          </select>
                        </div>
                        <div>
                          <div className="section-label mb-1.5">Actual PnL %</div>
                          <input
                            type="number"
                            step="0.01"
                            className="w-full bg-background border border-border rounded-sm px-3 py-1.5 text-sm font-mono text-foreground focus:outline-none"
                            placeholder="e.g. 8.4"
                            value={editPnl}
                            onChange={(e) => setEditPnl(e.target.value)}
                          />
                        </div>
                        <div>
                          <div className="section-label mb-1.5">Mistakes</div>
                          <input
                            type="text"
                            className="w-full bg-background border border-border rounded-sm px-3 py-1.5 text-sm font-mono text-foreground focus:outline-none"
                            placeholder="FOMO, Early entry..."
                            value={editMistakes}
                            onChange={(e) => setEditMistakes(e.target.value)}
                          />
                        </div>
                        <div>
                          <div className="section-label mb-1.5">Allocated USD</div>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="w-full bg-background border border-border rounded-sm px-3 py-1.5 text-sm font-mono text-foreground focus:outline-none"
                            placeholder="e.g. 150"
                            value={editAllocatedAmount}
                            onChange={(e) => setEditAllocatedAmount(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button
                          className="px-4 py-1.5 text-xs font-mono bg-foreground text-background rounded-sm hover:opacity-90"
                          onClick={saveExpand}
                        >
                          Save
                        </button>
                        <button
                          className="px-4 py-1.5 text-xs font-mono border border-border rounded-sm text-muted-foreground hover:text-foreground"
                          onClick={() => setExpandedId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                      {t.notes && (
                        <div className="mt-3 pt-3 border-t border-border text-xs font-mono text-muted-foreground">
                          {t.notes}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
