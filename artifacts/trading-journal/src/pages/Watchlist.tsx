import { useState } from "react";
import { useWatchlist } from "@/lib/store";
import { Trash2 } from "lucide-react";

export default function Watchlist() {
  const { watchlist, updateWatchlist, deleteFromWatchlist } = useWatchlist();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editOutcome, setEditOutcome] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const openExpand = (id: string) => {
    const item = watchlist.find((w) => w.id === id);
    if (!item) return;
    setExpandedId(id);
    setEditOutcome(item.outcome ?? "");
    setEditNotes(item.notes ?? "");
  };

  const saveExpand = () => {
    if (!expandedId) return;
    updateWatchlist(expandedId, { outcome: editOutcome || undefined, notes: editNotes });
    setExpandedId(null);
  };

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-sm font-semibold">Watchlist</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Setups that scored 40–54. Tracked separately — outcomes do not affect capital.
        </p>
      </div>

      {watchlist.length === 0 ? (
        <div className="border border-border rounded-sm py-12 text-center text-xs text-muted-foreground">
          No watchlist entries yet. Setups scoring 40–54 will appear here.
        </div>
      ) : (
        <div className="border border-border rounded-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-accent/20">
                <th className="px-3 py-2.5 text-left section-label">Date</th>
                <th className="px-3 py-2.5 text-left section-label">Coin</th>
                <th className="px-3 py-2.5 text-left section-label">Setup</th>
                <th className="px-3 py-2.5 text-left section-label">TF</th>
                <th className="px-3 py-2.5 text-left section-label">Score</th>
                <th className="px-3 py-2.5 text-left section-label">Outcome</th>
                <th className="px-3 py-2.5 text-left section-label"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {watchlist.map((w) => (
                <>
                  <tr
                    key={w.id}
                    className="hover:bg-accent/20 cursor-pointer"
                    onClick={() => expandedId === w.id ? setExpandedId(null) : openExpand(w.id)}
                  >
                    <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
                      {new Date(w.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-sm font-medium">{w.coin}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{w.setupType}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{w.timeframe}</td>
                    <td className="px-3 py-2.5 font-mono text-sm text-yellow-500">{w.finalScore}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{w.outcome ?? "Watching"}</td>
                    <td className="px-3 py-2.5">
                      <button
                        className="text-muted-foreground hover:text-red-400 transition-colors"
                        onClick={(e) => { e.stopPropagation(); deleteFromWatchlist(w.id); }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>

                  {expandedId === w.id && (
                    <tr key={`exp-${w.id}`}>
                      <td colSpan={7} className="px-4 py-4 bg-accent/10">
                        <div className="grid grid-cols-2 gap-4 max-w-md">
                          <div>
                            <div className="section-label mb-1.5">Outcome</div>
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
                        {w.notes && (
                          <div className="mt-3 pt-3 border-t border-border text-xs font-mono text-muted-foreground">
                            {w.notes}
                          </div>
                        )}
                        {w.warnings.length > 0 && (
                          <div className="mt-2 text-xs font-mono text-yellow-500/70">
                            {w.warnings.join(" · ")}
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
      )}
    </div>
  );
}
