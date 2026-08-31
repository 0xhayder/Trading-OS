import { Fragment, useState } from "react";
import { useSettings, useTrades } from "@/lib/store";
import { Trash2, ChevronUp, ChevronDown } from "lucide-react";
import CapitalSummary from "@/components/CapitalSummary";
import TradeDetailsPanel from "@/components/TradeDetailsPanel";
import type { PrimaryMistakeTag, Trade, TradeOutcome } from "@/lib/types";
import { formatTradeDateShort, formatTradeDateTime, formatTradeTimeOnly } from "@/lib/formatDates";

type SortKey = "createdAt" | "actualPnlPct";

const MISTAKE_TAGS: PrimaryMistakeTag[] = [
  "Early Entry",
  "Chased Entry",
  "No Confirmation",
  "Ignored Higher TF Trend",
  "Emotional Exit",
  "Revenge Trade",
  "Forced Setup",
  "Poor RR",
  "Ignored BTC Weakness",
  "Ignored Volume Weakness",
  "Moved SL Emotionally",
  "Oversized Position",
  "FOMO Entry",
  "No Clear Structure",
  "Overtrading",
];

function tagsFromTrade(tags: unknown): PrimaryMistakeTag[] {
  if (Array.isArray(tags)) return tags.filter((tag): tag is PrimaryMistakeTag => MISTAKE_TAGS.includes(tag as PrimaryMistakeTag));
  if (typeof tags === "string") {
    return tags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag): tag is PrimaryMistakeTag => MISTAKE_TAGS.includes(tag as PrimaryMistakeTag));
  }
  return [];
}

function normalizePnl(outcome: TradeOutcome | "", raw: string): number | undefined {
  if (!outcome) return undefined;
  if (outcome === "breakeven") return 0;
  const magnitude = Math.abs(parseFloat(raw));
  if (!Number.isFinite(magnitude)) return undefined;
  return outcome === "loss" ? -magnitude : magnitude;
}

export default function Journal() {
  const { trades, deleteTrade, updateTrade } = useTrades();
  const { refreshSettings } = useSettings();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingClosedId, setEditingClosedId] = useState<string | null>(null);
  const [editOutcome, setEditOutcome] = useState<TradeOutcome | "">("");
  const [editPnlMagnitude, setEditPnlMagnitude] = useState("");
  const [editAllocatedAmount, setEditAllocatedAmount] = useState("");
  const [editMistakeTags, setEditMistakeTags] = useState<PrimaryMistakeTag[]>([]);
  const [editMistakeNote, setEditMistakeNote] = useState("");
  const [editCloseNotes, setEditCloseNotes] = useState("");
  const [editManagementNotes, setEditManagementNotes] = useState("");
  const [editExecutionAnalysis, setEditExecutionAnalysis] = useState("");

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
    else {
      setSortKey(k);
      setSortDir("desc");
    }
  };

  const loadEditor = (t: Trade, editable: boolean) => {
    setExpandedId(t.id);
    setEditingClosedId(editable ? t.id : null);
    setEditOutcome(t.outcome ?? "");
    setEditPnlMagnitude(t.actualPnlPct != null ? String(Math.abs(t.actualPnlPct)) : "");
    setEditAllocatedAmount(t.allocatedAmountUsd != null ? String(t.allocatedAmountUsd) : "");
    setEditMistakeTags(tagsFromTrade(t.mistakeTags));
    setEditMistakeNote(t.mistakeNote ?? "");
    setEditCloseNotes(t.closeNotes ?? "");
    setEditManagementNotes(t.managementNotes ?? "");
    setEditExecutionAnalysis(t.executionAnalysis ?? "");
  };

  const saveExpand = () => {
    if (!expandedId) return;
    const allocatedAmount = parseFloat(editAllocatedAmount);
    const actualPnlPct = normalizePnl(editOutcome, editPnlMagnitude);

    void updateTrade(expandedId, {
      outcome: editOutcome || undefined,
      actualPnlPct,
      allocatedAmountUsd: Number.isFinite(allocatedAmount) ? allocatedAmount : undefined,
      mistakeTags: editMistakeTags,
      mistakeNote: editMistakeNote || undefined,
      closeNotes: editCloseNotes || undefined,
      managementNotes: editManagementNotes || undefined,
      executionAnalysis: editExecutionAnalysis || undefined,
      closedAt: editOutcome ? new Date().toISOString() : undefined,
    }).then((remote) => {
      if (remote) void refreshSettings();
    });
    setEditingClosedId(null);
  };

  const toggleTag = (tag: PrimaryMistakeTag) => {
    setEditMistakeTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
    );
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
        <CapitalSummary />
      </div>

      <div className="flex gap-3">
        <input
          className="flex-1 max-w-xs bg-background border border-border rounded-sm px-3 py-1.5 text-sm font-mono text-foreground placeholder-muted-foreground focus:outline-none focus:border-ring"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="form-select bg-background border border-border rounded-sm px-3 py-1.5 text-sm font-mono text-foreground focus:outline-none focus:border-ring"
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
              <th className="px-3 py-2.5 text-left section-label">Tier</th>
              <th className="px-3 py-2.5 text-left section-label">Timeframe</th>
              <th className="px-3 py-2.5 text-left section-label">State</th>
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
            {filtered.map((t) => {
              const isExpanded = expandedId === t.id;
              const isClosed = Boolean(t.outcome);
              const isEditing = editingClosedId === t.id || !isClosed;

              return (
                <Fragment key={t.id}>
                  <tr
                    className="hover:bg-accent/20 cursor-pointer"
                    onClick={() => (isExpanded ? setExpandedId(null) : loadEditor(t, false))}
                  >
                    <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground whitespace-nowrap">
                      <div>{formatTradeDateShort(t.createdAt)}</div>
                      <div className="text-[10px] text-muted-foreground/80">{formatTradeTimeOnly(t.createdAt)}</div>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-sm font-medium">{t.coin}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{t.setupType}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{t.marketCapTier ?? "-"}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{t.timeframe ?? "-"}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{isClosed ? "Closed" : "Open"}</td>
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
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTrade(t.id);
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr>
                      <td colSpan={8} className="px-4 py-4 bg-accent/10">
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div className="text-[11px] font-mono text-muted-foreground">
                            Logged: <span className="text-foreground/90">{formatTradeDateTime(t.createdAt)}</span>
                          </div>
                          {isClosed && editingClosedId !== t.id && (
                            <button
                              className="px-3 py-1.5 text-xs font-mono border border-border rounded-sm text-muted-foreground hover:text-foreground"
                              onClick={() => loadEditor(t, true)}
                            >
                              Edit
                            </button>
                          )}
                        </div>

                        <TradeDetailsPanel trade={t} />

                        {!isClosed && (
                          <div className="space-y-4 mt-4">
                            <CloseEditor
                              editOutcome={editOutcome}
                              setEditOutcome={setEditOutcome}
                              editPnlMagnitude={editPnlMagnitude}
                              setEditPnlMagnitude={setEditPnlMagnitude}
                              editAllocatedAmount={editAllocatedAmount}
                              setEditAllocatedAmount={setEditAllocatedAmount}
                              editMistakeTags={editMistakeTags}
                              toggleTag={toggleTag}
                              editMistakeNote={editMistakeNote}
                              setEditMistakeNote={setEditMistakeNote}
                              editCloseNotes={editCloseNotes}
                              setEditCloseNotes={setEditCloseNotes}
                              editManagementNotes={editManagementNotes}
                              setEditManagementNotes={setEditManagementNotes}
                              editExecutionAnalysis={editExecutionAnalysis}
                              setEditExecutionAnalysis={setEditExecutionAnalysis}
                            />
                            <ActionRow saveLabel="Close Trade" onSave={saveExpand} onCancel={() => setExpandedId(null)} />
                          </div>
                        )}

                        {isClosed && isEditing && (
                          <div className="space-y-4 mt-4">
                            <CloseEditor
                              editOutcome={editOutcome}
                              setEditOutcome={setEditOutcome}
                              editPnlMagnitude={editPnlMagnitude}
                              setEditPnlMagnitude={setEditPnlMagnitude}
                              editAllocatedAmount={editAllocatedAmount}
                              setEditAllocatedAmount={setEditAllocatedAmount}
                              editMistakeTags={editMistakeTags}
                              toggleTag={toggleTag}
                              editMistakeNote={editMistakeNote}
                              setEditMistakeNote={setEditMistakeNote}
                              editCloseNotes={editCloseNotes}
                              setEditCloseNotes={setEditCloseNotes}
                              editManagementNotes={editManagementNotes}
                              setEditManagementNotes={setEditManagementNotes}
                              editExecutionAnalysis={editExecutionAnalysis}
                              setEditExecutionAnalysis={setEditExecutionAnalysis}
                            />
                            <ActionRow saveLabel="Save Changes" onSave={saveExpand} onCancel={() => setEditingClosedId(null)} />
                          </div>
                        )}

                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CloseEditor({
  editOutcome,
  setEditOutcome,
  editPnlMagnitude,
  setEditPnlMagnitude,
  editAllocatedAmount,
  setEditAllocatedAmount,
  editMistakeTags,
  toggleTag,
  editMistakeNote,
  setEditMistakeNote,
  editCloseNotes,
  setEditCloseNotes,
  editManagementNotes,
  setEditManagementNotes,
  editExecutionAnalysis,
  setEditExecutionAnalysis,
}: {
  editOutcome: TradeOutcome | "";
  setEditOutcome: (v: TradeOutcome | "") => void;
  editPnlMagnitude: string;
  setEditPnlMagnitude: (v: string) => void;
  editAllocatedAmount: string;
  setEditAllocatedAmount: (v: string) => void;
  editMistakeTags: PrimaryMistakeTag[];
  toggleTag: (tag: PrimaryMistakeTag) => void;
  editMistakeNote: string;
  setEditMistakeNote: (v: string) => void;
  editCloseNotes: string;
  setEditCloseNotes: (v: string) => void;
  editManagementNotes: string;
  setEditManagementNotes: (v: string) => void;
  editExecutionAnalysis: string;
  setEditExecutionAnalysis: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl">
        <div>
          <div className="section-label mb-1.5">Outcome</div>
          <select
            className="form-select w-full bg-background border border-border rounded-sm px-3 py-1.5 text-sm font-mono text-foreground focus:outline-none"
            value={editOutcome}
            onChange={(e) => {
              const next = e.target.value as TradeOutcome | "";
              setEditOutcome(next);
              if (next === "breakeven") setEditPnlMagnitude("0");
            }}
          >
            <option value="">Open</option>
            <option value="win">Win</option>
            <option value="loss">Loss</option>
            <option value="breakeven">Breakeven</option>
          </select>
        </div>
        <div>
          <div className="section-label mb-1.5">Result % magnitude</div>
          <input
            type="number"
            step="0.01"
            min="0"
            disabled={editOutcome === "breakeven"}
            className="w-full bg-background border border-border rounded-sm px-3 py-1.5 text-sm font-mono text-foreground focus:outline-none disabled:opacity-50"
            placeholder="System applies sign"
            value={editOutcome === "breakeven" ? "0" : editPnlMagnitude}
            onChange={(e) => setEditPnlMagnitude(e.target.value)}
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

      <div>
        <div className="section-label mb-2">Primary mistake tags</div>
        <div className="flex flex-wrap gap-2">
          {MISTAKE_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`px-2.5 py-1 text-xs font-mono rounded-sm border ${
                editMistakeTags.includes(tag)
                  ? "border-foreground text-foreground bg-muted"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <Textarea label="Custom mistake note (not used as analytics category)" value={editMistakeNote} onChange={setEditMistakeNote} />
      <Textarea label="Close notes" value={editCloseNotes} onChange={setEditCloseNotes} />
      <Textarea label="Management notes" value={editManagementNotes} onChange={setEditManagementNotes} />
      <Textarea label="Execution analysis" value={editExecutionAnalysis} onChange={setEditExecutionAnalysis} />
    </div>
  );
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="section-label mb-1.5">{label}</div>
      <textarea
        className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm font-mono text-foreground placeholder-muted-foreground focus:outline-none focus:border-ring resize-none"
        rows={2}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function ActionRow({ saveLabel, onSave, onCancel }: { saveLabel: string; onSave: () => void; onCancel: () => void }) {
  return (
    <div className="flex gap-2">
      <button
        className="px-4 py-1.5 text-xs font-mono bg-foreground text-background rounded-sm hover:opacity-90"
        onClick={onSave}
      >
        {saveLabel}
      </button>
      <button
        className="px-4 py-1.5 text-xs font-mono border border-border rounded-sm text-muted-foreground hover:text-foreground"
        onClick={onCancel}
      >
        Cancel
      </button>
    </div>
  );
}
