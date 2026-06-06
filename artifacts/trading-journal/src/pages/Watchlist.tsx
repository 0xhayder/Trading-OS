import { Fragment, useState } from "react";
import { useWatchlist } from "@/lib/store";
import { Trash2 } from "lucide-react";
import CapitalSummary from "@/components/CapitalSummary";
import TradeDetailsPanel from "@/components/TradeDetailsPanel";
import { formatTradeDateShort, formatTradeDateTime, formatTradeTimeOnly } from "@/lib/formatDates";

export default function Watchlist() {
  const { watchlist, updateWatchlist, deleteFromWatchlist } = useWatchlist();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editOutcome, setEditOutcome] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const openExpand = (id: string) => {
    const item = watchlist.find((w) => w.id === id);
    if (!item) return;
    setExpandedId(id);
    setEditingId(null);
    setEditOutcome(item.outcome ?? "");
    setEditNotes(item.notes ?? "");
  };

  const saveExpand = () => {
    if (!expandedId) return;
    updateWatchlist(expandedId, { outcome: editOutcome || undefined, notes: editNotes });
    setEditingId(null);
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-sm font-semibold">Watchlist</h1>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Saved observation setups. Click a row to inspect the full engine detail; press Edit only when you want to change outcome notes.
          </p>
        </div>
        <CapitalSummary />
      </div>

      {watchlist.length === 0 ? (
        <div className="border border-border rounded-sm py-12 text-center text-xs text-muted-foreground">
          No watchlist entries yet. Save one from the score result screen using Save to watchlist.
        </div>
      ) : (
        <div className="border border-border rounded-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-accent/20">
                <th className="px-3 py-2.5 text-left section-label">Date</th>
                <th className="px-3 py-2.5 text-left section-label">Coin</th>
                <th className="px-3 py-2.5 text-left section-label">Setup</th>
                <th className="px-3 py-2.5 text-left section-label">Tier</th>
                <th className="px-3 py-2.5 text-left section-label">Score</th>
                <th className="px-3 py-2.5 text-left section-label">Outcome</th>
                <th className="px-3 py-2.5 text-left section-label"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {watchlist.map((w) => (
                <Fragment key={w.id}>
                  <tr
                    className="hover:bg-accent/20 cursor-pointer"
                    onClick={() => (expandedId === w.id ? setExpandedId(null) : openExpand(w.id))}
                  >
                    <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
                      <div>{formatTradeDateShort(w.createdAt)}</div>
                      <div className="text-[10px] text-muted-foreground/80">{formatTradeTimeOnly(w.createdAt)}</div>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-sm font-medium">{w.coin}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{w.setupType}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{w.marketCapTier ?? w.timeframe ?? "-"}</td>
                    <td className="px-3 py-2.5 font-mono text-sm text-yellow-500">{w.finalScore}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{w.outcome ?? "Watching"}</td>
                    <td className="px-3 py-2.5">
                      <button
                        className="text-muted-foreground hover:text-red-400 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFromWatchlist(w.id);
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>

                  {expandedId === w.id && (
                    <tr>
                      <td colSpan={7} className="px-4 py-4 bg-accent/10">
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div className="text-[11px] font-mono text-muted-foreground">
                            Saved: <span className="text-foreground/90">{formatTradeDateTime(w.createdAt)}</span>
                          </div>
                          {editingId !== w.id && (
                            <button
                              className="px-3 py-1.5 text-xs font-mono border border-border rounded-sm text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setEditingId(w.id);
                                setEditOutcome(w.outcome ?? "");
                                setEditNotes(w.notes ?? "");
                              }}
                            >
                              Edit
                            </button>
                          )}
                        </div>

                        <TradeDetailsPanel trade={w} kind="watchlist" />

                        {editingId === w.id && (
                          <div className="space-y-3 mt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                              <div>
                                <div className="section-label mb-1.5">Watch Outcome</div>
                                <input
                                  type="text"
                                  className="w-full bg-background border border-border rounded-sm px-3 py-1.5 text-sm font-mono text-foreground focus:outline-none"
                                  placeholder="e.g. Broke down, Never triggered..."
                                  value={editOutcome}
                                  onChange={(e) => setEditOutcome(e.target.value)}
                                />
                              </div>
                              <div>
                                <div className="section-label mb-1.5">Notes</div>
                                <input
                                  type="text"
                                  className="w-full bg-background border border-border rounded-sm px-3 py-1.5 text-sm font-mono text-foreground focus:outline-none"
                                  placeholder="Update notes..."
                                  value={editNotes}
                                  onChange={(e) => setEditNotes(e.target.value)}
                                />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                className="px-4 py-1.5 text-xs font-mono bg-foreground text-background rounded-sm hover:opacity-90"
                                onClick={saveExpand}
                              >
                                Save
                              </button>
                              <button
                                className="px-4 py-1.5 text-xs font-mono border border-border rounded-sm text-muted-foreground hover:text-foreground"
                                onClick={() => setEditingId(null)}
                              >
                                Cancel
                              </button>
                            </div>
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
      )}
    </div>
  );
}
