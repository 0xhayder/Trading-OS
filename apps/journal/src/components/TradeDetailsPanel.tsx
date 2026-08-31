import type { ReactNode } from "react";
import type { HistoricalSnapshot, Trade, WatchlistTrade } from "@/lib/types";

type DetailTrade = Trade | WatchlistTrade;

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value != null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function snapshotFromTrade(trade: DetailTrade): HistoricalSnapshot | undefined {
  if (trade.historicalSnapshot) return trade.historicalSnapshot;
  const breakdown = asRecord(trade.scoreBreakdown);
  const snapshot = asRecord(breakdown?.historicalSnapshot);
  return snapshot as HistoricalSnapshot | undefined;
}

function pct(value: number | null | undefined, signed = false) {
  if (value == null) return "-";
  const prefix = signed && value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}%`;
}

function rawNumber(value: number | null | undefined) {
  if (value == null) return "-";
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function usd(value: number | null | undefined) {
  if (value == null) return "-";
  const prefix = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${prefix}$${Math.abs(value).toFixed(2)}`;
}

function Field({
  label,
  value,
  className = "",
  wrap = false,
}: {
  label: string;
  value: string;
  className?: string;
  wrap?: boolean;
}) {
  return (
    <div className={`border border-border rounded-sm px-3 py-2 min-w-0 ${className}`}>
      <div className="section-label mb-1">{label}</div>
      <div className={`text-xs font-mono text-foreground font-semibold ${wrap ? "whitespace-normal break-words" : "truncate"}`}>{value}</div>
    </div>
  );
}

function NoteCard({ title, content }: { title: string; content: string }) {
  const text = content.trim();
  if (!text) return null;
  return (
    <div className="border border-border rounded-sm p-3 bg-background">
      <div className="text-xs font-semibold text-foreground mb-2">{title}</div>
      <div className="text-xs text-muted-foreground font-mono whitespace-pre-wrap leading-relaxed">{text}</div>
    </div>
  );
}

export default function TradeDetailsPanel({ trade, kind = "journal" }: { trade: DetailTrade; kind?: "journal" | "watchlist" }) {
  const isJournal = kind === "journal";
  const t = trade as Trade;
  const snapshot = snapshotFromTrade(trade);
  const rawTags: unknown = t.mistakeTags;
  const tags = Array.isArray(rawTags)
    ? rawTags.filter((tag): tag is string => typeof tag === "string")
    : typeof rawTags === "string"
      ? rawTags.split(",").map((tag: string) => tag.trim()).filter(Boolean)
      : [];
  const outcome = isJournal
    ? t.outcome === "win"
      ? "Win"
      : t.outcome === "loss"
        ? "Loss"
        : t.outcome === "breakeven"
          ? "Breakeven"
          : "Open"
    : trade.outcome || "Watching";

  return (
    <div className="space-y-3">
      {/* Trade Information */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Field label="Coin" value={trade.coin} />
        <Field label="Setup" value={trade.setupType} />
        <Field label="Market Cap Tier" value={trade.marketCapTier ?? "-"} />
        <Field label="Timeframe" value={trade.timeframe ?? "-"} />
        <Field label="Narrative Category" value={trade.narrativeCategory ?? "-"} />
      </div>

      {/* Trade Plan */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Field label="SL" value={pct(trade.stopLossPct)} />
        <Field
          label="TP"
          value={`${rawNumber(trade.tp1Pct)} / ${rawNumber(trade.tp2Pct)} / ${rawNumber(trade.tp3Pct)}`}
          wrap
        />
        <Field label="PnL $" value={usd(t.realizedPnlUsd)} />
        <Field label="Allocation" value={t.allocatedAmountUsd == null ? "-" : `$${t.allocatedAmountUsd.toFixed(2)}`} />
        <Field label="RR" value={trade.suggestedRr ? `${trade.suggestedRr.toFixed(2)}R` : "-"} />
      </div>

      {/* Outcome */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Field label="Result" value={outcome} />
        <Field label="PnL %" value={pct(t.actualPnlPct, true)} />
        <Field label="Mistakes (tagged)" value={tags.length ? tags.join(", ") : "None tagged"} className="md:col-span-3" wrap />
      </div>

      {/* Notes */}
      {(trade.notes?.trim() ||
        t.closeNotes?.trim() ||
        t.managementNotes?.trim() ||
        t.mistakeNote?.trim() ||
        t.executionAnalysis?.trim()) && (
        <div className="space-y-3">
          <NoteCard title="Entry Notes" content={trade.notes ?? ""} />
          <NoteCard title="Close Note" content={t.closeNotes ?? ""} />
          <NoteCard title="Management Note" content={t.managementNotes ?? ""} />
          <NoteCard title="Mistakes Note" content={t.mistakeNote ?? ""} />
          <NoteCard title="Execution Analysis" content={t.executionAnalysis ?? ""} />
        </div>
      )}

      {/* Historical Snapshot */}
      {snapshot && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Field label="Similar Trades Found" value={String(snapshot.similarTradesFound)} />
          <Field label="Average Similarity" value={pct(snapshot.averageSimilarityPct)} />
          <Field label="Expected Return" value={pct(snapshot.expectedReturnPct, true)} />
          <Field label="Historical Win Rate" value={pct(snapshot.historicalWinRate)} />
          <Field label="Confidence Level" value={snapshot.confidenceLevel} />
        </div>
      )}
    </div>
  );
}
