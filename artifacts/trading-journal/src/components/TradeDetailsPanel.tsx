import type { DecisionPresentation } from "@workspace/trading-engine";
import type { Trade, WatchlistTrade } from "@/lib/types";

type DetailTrade = Trade | WatchlistTrade;

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value != null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function presentationFromTrade(trade: DetailTrade): DecisionPresentation | undefined {
  if (trade.presentation) return trade.presentation;
  const breakdown = asRecord(trade.scoreBreakdown);
  const presentation = asRecord(breakdown?.presentation);
  return presentation as DecisionPresentation | undefined;
}

export default function TradeDetailsPanel({ trade, kind = "journal" }: { trade: DetailTrade; kind?: "journal" | "watchlist" }) {
  const p = presentationFromTrade(trade);
  const warnings = trade.warnings ?? [];
  const conflicts = p?.conflicts?.map((c) => `${c.title}: ${c.detail}`) ?? [];
  const why = p?.whyThisDecision ?? [];

  const isJournal = kind === "journal";

  // 1. Outcome Formatting
  let outcomeText = "Open";
  if (kind === "watchlist") {
    outcomeText = trade.outcome || "Watching";
  } else {
    const t = trade as Trade;
    if (t.outcome === "win") {
      outcomeText = "Win";
    } else if (t.outcome === "loss") {
      outcomeText = "Loss";
    } else if (t.outcome === "breakeven") {
      outcomeText = "Breakeven";
    }
  }

  // 2. PnL Formatting
  const t = trade as Trade;
  const hasPnl = isJournal && (t.realizedPnlUsd != null || t.actualPnlPct != null);
  
  let realizedPnlText = "-";
  let resultPctText = "-";

  if (hasPnl) {
    if (t.realizedPnlUsd != null) {
      realizedPnlText = t.realizedPnlUsd >= 0 ? `$${t.realizedPnlUsd.toFixed(2)}` : `$-${Math.abs(t.realizedPnlUsd).toFixed(2)}`;
    }
    if (t.actualPnlPct != null) {
      resultPctText = `${t.actualPnlPct >= 0 ? "+" : ""}${t.actualPnlPct.toFixed(2)}%`;
    }
  }

  // 3. Allocation Formatting
  let allocationText = "";
  if (isJournal && t.allocatedAmountUsd != null) {
    allocationText = `$${t.allocatedAmountUsd.toFixed(2)} (${trade.suggestedAllocationPct.toFixed(2)}% Suggested)`;
  } else {
    allocationText = `${trade.suggestedAllocationPct.toFixed(2)}% Suggested`;
  }

  // 4. Mistakes Formatting
  const rawTags = isJournal ? t.mistakeTags : undefined;
  const tagsList = Array.isArray(rawTags)
    ? rawTags
    : typeof rawTags === "string"
      ? (rawTags as string).split(",").map((s) => s.trim()).filter(Boolean)
      : [];
  const mistakesValText = tagsList.join(", ") || "None tagged";

  // Note cards visibility checks
  const showMistakeNote = isJournal && !!t.mistakeNote;
  const showCloseNotes = isJournal && !!t.closeNotes;
  const showManagementNotes = isJournal && !!t.managementNotes;
  const showExecutionAnalysis = isJournal && !!t.executionAnalysis;
  const showEngineNotes = why.length > 0 || warnings.length > 0 || conflicts.length > 0 || p?.headline || trade.finalDecision;
  const showUserNotes = !!trade.notes;

  return (
    <div className="space-y-3">
      {/* 1. Core Summary Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Trade Score */}
        <div className="border border-border rounded-sm px-3 py-2">
          <div className="section-label mb-1">TRADE SCORE</div>
          <div className="text-xs font-mono text-foreground font-semibold">{trade.finalScore}</div>
        </div>

        {/* Outcome */}
        <div className="border border-border rounded-sm px-3 py-2">
          <div className="section-label mb-1">OUTCOME</div>
          <div className="text-xs font-mono text-foreground font-semibold uppercase">{outcomeText}</div>
        </div>

        {/* Realized PnL (If journal trade and has PnL) */}
        {isJournal && (
          <div className="border border-border rounded-sm px-3 py-2">
            <div className="section-label mb-1">REALIZED PNL</div>
            <div className="text-xs font-mono text-foreground font-semibold">{realizedPnlText}</div>
          </div>
        )}

        {/* Result % (If journal trade and has PnL) */}
        {isJournal && (
          <div className="border border-border rounded-sm px-3 py-2">
            <div className="section-label mb-1">RESULT %</div>
            <div className="text-xs font-mono text-foreground font-semibold">{resultPctText}</div>
          </div>
        )}

        {/* Allocation Size */}
        <div className="border border-border rounded-sm px-3 py-2">
          <div className="section-label mb-1">ALLOCATION SIZE</div>
          <div className="text-xs font-mono text-foreground font-semibold">{allocationText}</div>
        </div>

        {/* Risk-Reward (RR) */}
        <div className="border border-border rounded-sm px-3 py-2">
          <div className="section-label mb-1">RR</div>
          <div className="text-xs font-mono text-foreground font-semibold">
            {trade.suggestedRr ? `${trade.suggestedRr}:1` : "-"}
          </div>
        </div>

        {/* Mistakes (If journal trade, spans 2 columns on desktop) */}
        {isJournal && (
          <div className="border border-border rounded-sm px-3 py-2 md:col-span-2">
            <div className="section-label mb-1">MISTAKES</div>
            <div className="text-xs font-mono text-foreground font-semibold">{mistakesValText}</div>
          </div>
        )}
      </div>

      {/* 2. Engine Notes / Insights */}
      {showEngineNotes && (
        <div className="border border-border rounded-sm p-3">
          <div className="section-label mb-2">NOTES FROM THE ENGINE</div>
          <div className="space-y-3 font-mono text-xs text-muted-foreground leading-relaxed">
            <div className="text-foreground font-semibold uppercase">
              DECISION STATE: {p?.headline ?? trade.finalDecision ?? trade.tradeStatus}
            </div>
            {why.length > 0 && (
              <div className="space-y-1">
                <div className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-semibold">RATIONALE</div>
                <ul className="list-disc list-inside space-y-0.5 pl-1">
                  {why.map((line, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {warnings.length > 0 && (
              <div className="space-y-1">
                <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-semibold">WARNINGS</div>
                <ul className="list-disc list-inside space-y-0.5 pl-1">
                  {warnings.map((line, idx) => (
                    <li key={idx} className="text-muted-foreground leading-relaxed">
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {conflicts.length > 0 && (
              <div className="space-y-1">
                <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-semibold">CONFLICTS</div>
                <ul className="list-disc list-inside space-y-0.5 pl-1">
                  {conflicts.map((line, idx) => (
                    <li key={idx} className="text-muted-foreground leading-relaxed">
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. User Notes Added at Entry */}
      {showUserNotes && (
        <div className="border border-border rounded-sm p-3">
          <div className="section-label mb-2">USER NOTES (AT ENTRY)</div>
          <div className="text-xs text-muted-foreground font-mono whitespace-pre-wrap leading-relaxed">
            {trade.notes}
          </div>
        </div>
      )}

      {/* 4. Mistakes Notes (Mistake note) */}
      {showMistakeNote && (
        <div className="border border-border rounded-sm p-3">
          <div className="section-label mb-2">MISTAKE NOTE</div>
          <div className="text-xs text-muted-foreground font-mono whitespace-pre-wrap leading-relaxed">
            {t.mistakeNote}
          </div>
        </div>
      )}

      {/* 5. Closed Trade Notes (Close notes) */}
      {showCloseNotes && (
        <div className="border border-border rounded-sm p-3">
          <div className="section-label mb-2">CLOSE NOTES</div>
          <div className="text-xs text-muted-foreground font-mono whitespace-pre-wrap leading-relaxed">
            {t.closeNotes}
          </div>
        </div>
      )}

      {/* 6. Management Notes */}
      {showManagementNotes && (
        <div className="border border-border rounded-sm p-3">
          <div className="section-label mb-2">MANAGEMENT NOTES</div>
          <div className="text-xs text-muted-foreground font-mono whitespace-pre-wrap leading-relaxed">
            {t.managementNotes}
          </div>
        </div>
      )}

      {/* 7. Execution Analysis */}
      {showExecutionAnalysis && (
        <div className="border border-border rounded-sm p-3">
          <div className="section-label mb-2">EXECUTION ANALYSIS</div>
          <div className="text-xs text-muted-foreground font-mono whitespace-pre-wrap leading-relaxed">
            {t.executionAnalysis}
          </div>
        </div>
      )}
    </div>
  );
}
