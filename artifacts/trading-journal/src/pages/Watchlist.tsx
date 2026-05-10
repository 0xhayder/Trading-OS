import { useState } from "react";
import { useWatchlist } from "@/lib/store";
import { Plus, Trash2, CheckCircle } from "lucide-react";
import type { WatchlistItem } from "@/lib/types";

const SETUP_TYPES = ["Breakout Retest", "Double Bottom", "Trendline Trade"];
const TIMEFRAMES = ["4H", "Daily", "Weekly"];

export default function Watchlist() {
  const { watchlist, addItem, updateItem, deleteItem } = useWatchlist();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ coin: "", setupType: "Breakout Retest", timeframe: "Daily", notes: "" });
  const [editId, setEditId] = useState<string | null>(null);
  const [editOutcome, setEditOutcome] = useState("");

  const handleAdd = () => {
    if (!form.coin.trim()) return;
    addItem({
      id: `w-${Date.now()}`,
      coin: form.coin.toUpperCase(),
      setupType: form.setupType,
      timeframe: form.timeframe,
      notes: form.notes,
      createdAt: new Date().toISOString(),
    });
    setForm({ coin: "", setupType: "Breakout Retest", timeframe: "Daily", notes: "" });
    setShowForm(false);
  };

  const saveOutcome = (id: string) => {
    updateItem(id, { outcome: editOutcome });
    setEditId(null);
    setEditOutcome("");
  };

  const F = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <div className="section-label mb-1.5">{label}</div>
      {children}
    </div>
  );

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold tracking-tight">Watchlist</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Setups to monitor — {watchlist.length} items</p>
        </div>
        <button
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono bg-foreground text-background rounded-sm hover:opacity-90 transition-opacity"
          onClick={() => setShowForm((v) => !v)}
          data-testid="button-add-watchlist"
        >
          <Plus size={12} />
          Add Setup
        </button>
      </div>

      {showForm && (
        <div className="border border-border bg-card rounded-sm p-5 space-y-4">
          <div className="section-label">New Watchlist Entry</div>
          <div className="grid grid-cols-3 gap-4">
            <F label="Coin / Pair">
              <input
                className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-ring font-mono"
                placeholder="TAO/USDT"
                value={form.coin}
                onChange={(e) => setForm((p) => ({ ...p, coin: e.target.value }))}
                data-testid="input-watchlist-coin"
              />
            </F>
            <F label="Setup Type">
              <select
                className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:border-ring font-mono"
                value={form.setupType}
                onChange={(e) => setForm((p) => ({ ...p, setupType: e.target.value }))}
              >
                {SETUP_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </F>
            <F label="Timeframe">
              <select
                className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:border-ring font-mono"
                value={form.timeframe}
                onChange={(e) => setForm((p) => ({ ...p, timeframe: e.target.value }))}
              >
                {TIMEFRAMES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </F>
          </div>
          <F label="Notes">
            <textarea
              className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-ring font-mono resize-none"
              rows={2}
              placeholder="Why is this on watch? What needs to happen?"
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              data-testid="textarea-watchlist-notes"
            />
          </F>
          <div className="flex gap-2">
            <button
              className="px-4 py-1.5 text-xs font-mono bg-foreground text-background rounded-sm hover:opacity-90"
              onClick={handleAdd}
              data-testid="button-submit-watchlist"
            >
              Add to Watchlist
            </button>
            <button
              className="px-4 py-1.5 text-xs font-mono border border-border rounded-sm text-muted-foreground hover:text-foreground"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {watchlist.length === 0 && (
          <div className="border border-border bg-card rounded-sm py-12 text-center text-muted-foreground text-sm">
            No setups on watchlist
          </div>
        )}
        {watchlist.map((item) => (
          <div key={item.id} className="border border-border bg-card rounded-sm p-4" data-testid={`card-watchlist-${item.id}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-mono text-sm font-semibold">{item.coin}</span>
                  <span className="text-xs text-muted-foreground border border-border px-2 py-0.5 rounded-sm font-mono">
                    {item.setupType}
                  </span>
                  <span className="text-xs text-muted-foreground border border-border px-2 py-0.5 rounded-sm font-mono">
                    {item.timeframe}
                  </span>
                  {item.outcome && (
                    <span className="text-xs border px-2 py-0.5 rounded-sm font-mono text-green-400 border-green-400/30">
                      {item.outcome}
                    </span>
                  )}
                </div>
                {item.notes && (
                  <p className="mt-2 text-xs text-muted-foreground font-mono leading-relaxed">{item.notes}</p>
                )}
                <div className="mt-2 text-[10px] text-muted-foreground/50 font-mono">
                  Added {new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {editId === item.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      className="bg-background border border-border rounded-sm px-2 py-1 text-xs font-mono text-foreground w-28 focus:outline-none focus:border-ring"
                      placeholder="Outcome..."
                      value={editOutcome}
                      onChange={(e) => setEditOutcome(e.target.value)}
                    />
                    <button
                      className="text-green-400 hover:text-green-300 text-xs font-mono"
                      onClick={() => saveOutcome(item.id)}
                    >
                      Save
                    </button>
                    <button
                      className="text-muted-foreground hover:text-foreground text-xs font-mono"
                      onClick={() => setEditId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => { setEditId(item.id); setEditOutcome(item.outcome ?? ""); }}
                    title="Log outcome"
                  >
                    <CheckCircle size={14} />
                  </button>
                )}
                <button
                  className="text-muted-foreground hover:text-red-400 transition-colors"
                  onClick={() => deleteItem(item.id)}
                  data-testid={`button-delete-watchlist-${item.id}`}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
