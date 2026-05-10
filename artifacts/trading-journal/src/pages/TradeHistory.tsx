import { useState } from "react";
import { useTrades } from "@/lib/store";
import { Trash2, ChevronUp, ChevronDown, Search } from "lucide-react";
import type { Trade } from "@/lib/types";

type SortKey = "createdAt" | "finalScore" | "actualPnlPct" | "coin";

const STATUS_BADGE: Record<string, string> = {
  "Expansion Trade": "text-green-400 border-green-400/30",
  "High Conviction": "text-green-400 border-green-400/30",
  "Standard Trade": "text-foreground border-border",
  "Watchlist": "text-yellow-500 border-yellow-500/30",
  "Reject": "text-red-400 border-red-400/30",
};

export default function TradeHistory() {
  const { trades, deleteTrade, updateTrade } = useTrades();
  const [search, setSearch] = useState("");
  const [filterOutcome, setFilterOutcome] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [editId, setEditId] = useState<string | null>(null);
  const [editOutcome, setEditOutcome] = useState<string>("");
  const [editPnl, setEditPnl] = useState<string>("");
  const [editMistakes, setEditMistakes] = useState<string>("");

  const filtered = trades
    .filter((t) => {
      if (search && !t.coin.toLowerCase().includes(search.toLowerCase()) && !t.setupType.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterOutcome !== "all" && t.outcome !== filterOutcome && !(filterOutcome === "open" && t.status === "open")) return false;
      return true;
    })
    .sort((a, b) => {
      let va: number | string = a[sortKey] ?? 0;
      let vb: number | string = b[sortKey] ?? 0;
      if (sortKey === "createdAt") { va = new Date(va as string).getTime(); vb = new Date(vb as string).getTime(); }
      if (typeof va === "string") return sortDir === "asc" ? va.localeCompare(vb as string) : (vb as string).localeCompare(va);
      return sortDir === "asc" ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (sortDir === "asc" ? <ChevronUp size={10} /> : <ChevronDown size={10} />) : null;

  const startEdit = (t: Trade) => {
    setEditId(t.id);
    setEditOutcome(t.outcome ?? "");
    setEditPnl(t.actualPnlPct != null ? String(t.actualPnlPct) : "");
    setEditMistakes(t.mistakeTags ?? "");
  };

  const saveEdit = () => {
    if (!editId) return;
    const pnl = parseFloat(editPnl);
    updateTrade(editId, {
      outcome: editOutcome as Trade["outcome"],
      actualPnlPct: isNaN(pnl) ? undefined : pnl,
      mistakeTags: editMistakes,
      status: editOutcome ? "closed" : "open",
    });
    setEditId(null);
  };

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-base font-semibold tracking-tight">Trade Journal</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Full history — {trades.length} entries</p>
      </div>

      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full bg-card border border-border rounded-sm pl-8 pr-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-ring font-mono"
            placeholder="Search coin or setup..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search"
          />
        </div>
        <select
          className="bg-card border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:border-ring font-mono"
          value={filterOutcome}
          onChange={(e) => setFilterOutcome(e.target.value)}
          data-testid="select-outcome-filter"
        >
          <option value="all">All Outcomes</option>
          <option value="open">Open</option>
          <option value="win">Win</option>
          <option value="loss">Loss</option>
          <option value="breakeven">Breakeven</option>
        </select>
      </div>

      <div className="border border-border bg-card rounded-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {[
                { label: "Date", key: "createdAt" as SortKey },
                { label: "Coin", key: "coin" as SortKey },
                { label: "Setup", key: null },
                { label: "TF", key: null },
                { label: "Score", key: "finalScore" as SortKey },
                { label: "Status", key: null },
                { label: "PnL", key: "actualPnlPct" as SortKey },
                { label: "Decision", key: null },
                { label: "", key: null },
              ].map(({ label, key }, i) => (
                <th
                  key={i}
                  className={`px-3 py-2.5 text-left section-label ${key ? "cursor-pointer hover:text-muted-foreground/80 select-none" : ""}`}
                  onClick={() => key && toggleSort(key)}
                >
                  <span className="flex items-center gap-1">
                    {label}
                    {key && <SortIcon k={key} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-muted-foreground text-sm">
                  No trades match the current filter
                </td>
              </tr>
            )}
            {filtered.map((t) => (
              <>
                <tr
                  key={t.id}
                  className="hover:bg-accent/30 cursor-pointer"
                  onClick={() => editId === t.id ? setEditId(null) : startEdit(t)}
                  data-testid={`row-trade-${t.id}`}
                >
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-sm font-medium whitespace-nowrap">{t.coin}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{t.setupType}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{t.timeframe}</td>
                  <td className="px-3 py-2.5 font-mono text-sm">{t.finalScore}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs border px-2 py-0.5 rounded-sm font-mono ${STATUS_BADGE[t.tradeStatus] ?? "text-foreground border-border"}`}>
                      {t.tradeStatus}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-sm whitespace-nowrap">
                    {t.actualPnlPct != null ? (
                      <span className={t.actualPnlPct >= 0 ? "text-green-400" : "text-red-400"}>
                        {t.actualPnlPct >= 0 ? "+" : ""}{t.actualPnlPct.toFixed(2)}%
                      </span>
                    ) : (
                      <span className="text-yellow-500 text-xs">OPEN</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground max-w-[140px] truncate font-mono">
                    {t.finalDecision}
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      className="text-muted-foreground hover:text-red-400 transition-colors"
                      onClick={(e) => { e.stopPropagation(); deleteTrade(t.id); }}
                      data-testid={`button-delete-${t.id}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
                {editId === t.id && (
                  <tr key={`edit-${t.id}`} className="bg-accent/20">
                    <td colSpan={9} className="px-4 py-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <div className="section-label mb-1.5">Outcome</div>
                          <select
                            className="w-full bg-background border border-border rounded-sm px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-ring font-mono"
                            value={editOutcome}
                            onChange={(e) => setEditOutcome(e.target.value)}
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
                            className="w-full bg-background border border-border rounded-sm px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-ring font-mono"
                            placeholder="e.g. 8.4"
                            value={editPnl}
                            onChange={(e) => setEditPnl(e.target.value)}
                          />
                        </div>
                        <div>
                          <div className="section-label mb-1.5">Mistake Tags</div>
                          <input
                            type="text"
                            className="w-full bg-background border border-border rounded-sm px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-ring font-mono"
                            placeholder="FOMO, Early Entry..."
                            value={editMistakes}
                            onChange={(e) => setEditMistakes(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button
                          className="px-4 py-1.5 text-xs font-mono bg-foreground text-background rounded-sm hover:opacity-90"
                          onClick={saveEdit}
                        >
                          Save
                        </button>
                        <button
                          className="px-4 py-1.5 text-xs font-mono border border-border rounded-sm text-muted-foreground hover:text-foreground"
                          onClick={() => setEditId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                      {t.notes && (
                        <div className="mt-3 text-xs text-muted-foreground font-mono border-t border-border pt-3">
                          Notes: {t.notes}
                        </div>
                      )}
                      {t.tradeWarnings.length > 0 && (
                        <div className="mt-2 text-xs text-yellow-500 font-mono">
                          Warnings: {t.tradeWarnings.join(" | ")}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
