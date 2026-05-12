import type { DecisionPresentation } from "@workspace/trading-engine";
import type { TradeInput, ScoreResult } from "@/lib/types";
import { formatTradeDateTime } from "@/lib/formatDates";
import { AlertTriangle, Ban, CheckCircle2, Eye, OctagonX } from "lucide-react";

function StateIcon({ icon }: { icon: DecisionPresentation["icon"] }) {
  const cls = "h-10 w-10 shrink-0";
  switch (icon) {
    case "check":
      return <CheckCircle2 className={`${cls} text-emerald-400`} aria-hidden />;
    case "alert-soft":
      return <AlertTriangle className={`${cls} text-amber-400`} aria-hidden />;
    case "eye":
      return <Eye className={`${cls} text-sky-400`} aria-hidden />;
    case "ban":
      return <Ban className={`${cls} text-orange-400`} aria-hidden />;
    case "x-octagon":
      return <OctagonX className={`${cls} text-rose-300`} aria-hidden />;
    default:
      return null;
  }
}

function ScoreReadout({
  label,
  value,
  muted,
}: {
  label: string;
  value: number;
  muted: boolean;
}) {
  return (
    <div className="rounded-sm border border-border/80 bg-background/40 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`font-mono text-xl font-semibold tabular-nums ${muted ? "text-foreground" : "text-foreground"}`}>
        {value}
        <span className="text-xs font-normal text-muted-foreground"> /100</span>
      </div>
    </div>
  );
}

function PillarCard({
  title,
  score,
  lines,
  muted,
}: {
  title: string;
  score: number;
  lines: string[];
  muted: boolean;
}) {
  return (
    <div className="rounded-sm border border-border bg-background/30 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-foreground">{title}</span>
        <span className={`font-mono text-sm tabular-nums ${muted ? "text-muted-foreground" : "text-foreground"}`}>
          {score}
        </span>
      </div>
      <ul className="space-y-1 text-[11px] text-muted-foreground leading-snug">
        {lines.map((line) => (
          <li key={line}>· {line}</li>
        ))}
      </ul>
    </div>
  );
}

export interface DecisionTerminalProps {
  form: TradeInput;
  result: ScoreResult;
  presentation: DecisionPresentation;
  capital: number;
  minAllocationUsd: number;
  maxAllocationUsd: number;
  allocatedAmountUsd: string;
  setAllocatedAmountUsd: (v: string) => void;
  onLogTrade: () => void;
  onWatchlist: () => void;
  onDiscard: () => void;
}

export function DecisionTerminal({
  form,
  result,
  presentation: p,
  capital,
  minAllocationUsd,
  maxAllocationUsd,
  allocatedAmountUsd,
  setAllocatedAmountUsd,
  onLogTrade,
  onWatchlist,
  onDiscard,
}: DecisionTerminalProps) {
  const muted = p.tone.hidePositiveAccents;

  return (
    <div className="space-y-6">
      {result.scoredAt && (
        <p className="text-[11px] font-mono text-muted-foreground">
          Result time: <span className="text-foreground/80">{formatTradeDateTime(result.scoredAt)}</span>
        </p>
      )}
      <div
        className={`rounded-md border-2 px-4 py-5 sm:px-6 sm:py-6 ${p.tone.borderClass} ${p.tone.bgClass} shadow-sm`}
      >
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <StateIcon icon={p.icon} />
          <div className="flex-1 space-y-2 min-w-0">
            <div className={`text-2xl sm:text-3xl font-bold tracking-tight font-mono ${p.tone.accentTextClass}`}>
              {p.headline}
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed max-w-prose">{p.subline}</p>
            <p className="text-xs text-muted-foreground border-t border-white/5 pt-3 mt-2">
              {p.primaryCta.description}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
          <ScoreReadout label="Raw opportunity" value={p.opportunityQuality.score} muted={muted} />
          <ScoreReadout label="Market regime" value={p.marketRegimeSafety.score} muted={muted} />
          <ScoreReadout label="Risk state" value={p.riskState.score} muted={muted} />
          <div className="rounded-sm border border-border/80 bg-background/40 px-3 py-2 col-span-2 lg:col-span-1">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Execution</div>
            <div className={`text-sm font-medium ${p.executionPermission.allowed ? "text-foreground" : "text-orange-300"}`}>
              {p.executionPermission.allowed ? "Allowed" : "Not allowed"}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{p.executionPermission.blurb}</p>
          </div>
          <div className="rounded-sm border border-border/80 bg-background/40 px-3 py-2 col-span-2 lg:col-span-1">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Aggression</div>
            <div className="text-sm font-medium text-foreground capitalize">{p.positionAggression.label}</div>
            <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{p.positionAggression.blurb}</p>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed border border-border/60 rounded-sm px-3 py-2 bg-muted/10">
          <span className="text-foreground/80 font-medium">Opportunity: </span>
          {p.opportunityQuality.blurb}{" "}
          <span className="text-foreground/80 font-medium">Regime: </span>
          {p.marketRegimeSafety.blurb}{" "}
          <span className="text-foreground/80 font-medium">Risk: </span>
          {p.riskState.blurb}
        </p>
      </div>

      <div className="rounded-sm border border-border p-4 space-y-3 bg-background/20">
        <div className="text-xs font-semibold text-foreground">Five scores (each tells a different story)</div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <PillarCard title="1 · Structure" score={p.pillars.structure.score} lines={p.pillars.structure.lines} muted={muted} />
          <PillarCard title="2 · Momentum" score={p.pillars.momentum.score} lines={p.pillars.momentum.lines} muted={muted} />
          <PillarCard
            title="3 · Market regime"
            score={p.pillars.marketRegime.score}
            lines={p.pillars.marketRegime.lines}
            muted={muted}
          />
          <PillarCard title="4 · Risk stack" score={p.pillars.risk.score} lines={p.pillars.risk.lines} muted={muted} />
          <div className="rounded-sm border border-dashed border-border bg-muted/20 p-3 space-y-2 sm:col-span-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-foreground">5 · Final execution score</span>
              <span className={`font-mono text-lg tabular-nums ${muted ? "text-muted-foreground" : "text-foreground"}`}>
                {p.pillars.finalExecution.score} /100
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{p.pillars.finalExecution.blurb}</p>
          </div>
        </div>
      </div>

      <div className="rounded-sm border border-border p-4 space-y-3">
        <div className="text-xs font-semibold text-foreground">Why this decision?</div>
        <ul className="space-y-2 text-sm text-foreground/90 leading-relaxed">
          {p.whyThisDecision.map((line, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-muted-foreground shrink-0">—</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground border-t border-border pt-3">
          Old note: a high number alone never overrides the headline state. Read the headline first, then the scores.
        </p>
      </div>

      {p.conflicts.length > 0 && (
        <div className="rounded-sm border border-orange-500/25 bg-orange-950/10 p-4 space-y-2">
          <div className="text-xs font-semibold text-orange-200">Active conflicts</div>
          <div className="grid sm:grid-cols-2 gap-2">
            {p.conflicts.map((c) => (
              <div key={c.id} className="rounded-sm border border-orange-500/20 bg-background/40 p-3">
                <div className="text-xs font-medium text-orange-100">{c.title}</div>
                <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{c.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-sm border border-border p-4 space-y-3 bg-background/15">
        <div className="text-xs font-semibold text-foreground">Allocation picture</div>
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Suggested size · </span>
            <span className="font-mono">{p.allocation.suggestedPct}%</span>
            <span className="text-muted-foreground text-xs">
              {" "}
              (band {p.allocation.bandMin}% – {p.allocation.bandMax}%)
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Class · </span>
            <span className="font-medium capitalize">{p.allocation.allocationClass}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Engine aggression · </span>
            <span className="capitalize">{p.allocation.aggressionLevel}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Volatility feel · </span>
            <span>{p.allocation.expectedVolatility}</span>
          </div>
          <div className="sm:col-span-2">
            <span className="text-muted-foreground">Capital comfort · </span>
            <span>{p.allocation.capitalExposureQuality}</span>
          </div>
          <div className="sm:col-span-2 text-xs text-muted-foreground font-mono">
            On ${capital.toLocaleString()} equity, that band is about ${minAllocationUsd.toLocaleString()} – $
            {maxAllocationUsd.toLocaleString()}.
          </div>
        </div>
      </div>

      <div className="rounded-sm border border-border p-4 space-y-4">
        <div>
          <div className="text-xs font-semibold text-foreground">Take-profit ladder</div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Playbook: <span className="text-foreground capitalize">{p.takeProfitLadder.playbook}</span> —{" "}
            {p.takeProfitLadder.playbookNote}
          </p>
          <p className="text-[11px] text-muted-foreground mt-2">{p.takeProfitLadder.expectedHold}</p>
        </div>
        <div className="space-y-3 border-l-2 border-border pl-4 ml-1">
          {p.takeProfitLadder.legs.map((leg) => (
            <div key={leg.level} className="relative">
              <div className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-border" />
              <div className="font-mono text-xs font-semibold text-foreground">
                {leg.level}
                {leg.pct > 0 ? ` · ${leg.pct}%` : ""}
              </div>
              <p className="text-xs text-foreground/90 mt-0.5">{leg.purpose}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{leg.decayNote}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Form targets: SL {form.stopLossPct}% · TP1 {form.tp1Pct}% · TP2 {form.tp2Pct}% · RR readout {result.suggestedRr > 0 ? `${result.suggestedRr}:1` : "—"}
        </p>
      </div>

      {result.warnings.length > 0 && (
        <div className="rounded-sm border border-amber-500/20 bg-amber-950/10 p-4 space-y-2">
          <div className="text-xs font-semibold text-amber-200">Warnings</div>
          {result.warnings.map((w, i) => (
            <div key={i} className="text-xs text-amber-100/90 font-mono leading-relaxed">
              — {w}
            </div>
          ))}
        </div>
      )}

      {(p.dominantState === "execute" || p.dominantState === "execute_cautiously") && (
        <div className="rounded-sm border border-border p-4 space-y-2">
          <div className="text-xs font-semibold text-foreground">Amount to use (USD)</div>
          <input
            type="number"
            min="0"
            step="0.01"
            className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-ring"
            placeholder="How much capital for this trade"
            value={allocatedAmountUsd}
            onChange={(e) => setAllocatedAmountUsd(e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground">
            Suggested from engine band: ${minAllocationUsd.toLocaleString()} – ${maxAllocationUsd.toLocaleString()}.
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2 pt-1">
        {p.dominantState === "execute" && (
          <button
            type="button"
            className="flex-1 py-3 text-sm font-mono font-semibold rounded-sm bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
            onClick={onLogTrade}
          >
            {p.primaryCta.label}
          </button>
        )}
        {p.dominantState === "execute_cautiously" && (
          <button
            type="button"
            className="flex-1 py-3 text-sm font-mono font-semibold rounded-sm bg-amber-600 text-amber-950 hover:bg-amber-500 transition-colors"
            onClick={onLogTrade}
          >
            {p.primaryCta.label}
          </button>
        )}
        {p.dominantState === "watchlist" && (
          <button
            type="button"
            className="flex-1 py-3 text-sm font-mono font-semibold rounded-sm bg-sky-700 text-white hover:bg-sky-600 transition-colors"
            onClick={onWatchlist}
          >
            {p.primaryCta.label}
          </button>
        )}
        {(p.dominantState === "blocked" || p.dominantState === "hard_reject") && p.primaryCta.kind !== "none" && (
          <button
            type="button"
            className="flex-1 py-3 text-sm font-mono rounded-sm border border-border text-muted-foreground hover:bg-muted/40 transition-colors opacity-80"
            onClick={onLogTrade}
          >
            {p.primaryCta.label}
          </button>
        )}

        <button
          type="button"
          className={`sm:w-44 py-3 text-sm font-mono rounded-sm border border-border transition-colors ${
            p.secondaryCta.emphasis === "bold"
              ? "font-bold text-foreground bg-muted/30 hover:bg-muted/50"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={onDiscard}
        >
          {p.secondaryCta.label}
        </button>
      </div>
    </div>
  );
}
