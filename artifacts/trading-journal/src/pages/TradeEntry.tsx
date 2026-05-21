import { useState } from "react";
import { useLocation } from "wouter";
import { useSettings, useTrades, useWatchlist } from "@/lib/store";
import CapitalSummary from "@/components/CapitalSummary";
import { scoreTradeInput } from "@/lib/scorer";
import { MARKET_TREND_OPTIONS, TOKEN_STRUCTURE_OPTIONS } from "@/lib/tradeFormConstants";
import type {
  BtcVolatilityState,
  EntryLocation,
  EventRisk,
  InvalidationType,
  LiquidityStability,
  MarketCapTier,
  MarketTrend,
  MoveSlRule,
  NarrativeCategory,
  NarrativeHeat,
  Overextension,
  PostBreakoutBehavior,
  RelativeVolume,
  ScoreResult,
  SetupType,
  TokenMarketStructure,
  TradeInput,
  VolumeState,
} from "@/lib/types";
import { ArrowLeft } from "lucide-react";
import { DecisionTerminal } from "@/components/DecisionTerminal";

const FORM_GRID = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3";

const DEFAULTS: TradeInput = {
  coin: "",
  setupType: "Breakout Retest",
  narrativeCategory: "AI",
  marketCapTier: "Mid Cap",
  btcTrend: "Neutral",
  altTrend: "Neutral",
  btcVolatilityState: "Calm",
  narrativeHeat: "Active",
  tokenHigherTfStructure: "Ranging",
  tokenMidTfStructure: "Ranging",
  tokenLowerTfStructure: "Ranging",
  volumeState: "Normal",
  relativeVolume: "Average",
  postBreakoutBehavior: "Holding",
  stopLossPct: 0,
  tp1Pct: undefined,
  tp2Pct: undefined,
  tp3Pct: undefined,
  tp1PositionPct: 40,
  tp2PositionPct: 40,
  tp3PositionPct: 20,
  entryLocation: "At Key Level",
  overextension: "Calm",
  eventRisk: "Low",
  liquidityStability: "Stable",
  moveSlRule: "After TP1",
  invalidationType: "Structure Loss",
  notes: "",
};

function Label({ text }: { text: string }) {
  return <div className="section-label mb-1.5">{text}</div>;
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <span className="section-label shrink-0">{label}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  return (
    <div>
      <Label text={label} />
      <select
        className="form-select w-full bg-background border border-border rounded-sm px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-ring cursor-pointer"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  placeholder,
  optional,
  step = "0.01",
  min = "0",
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  placeholder?: string;
  optional?: boolean;
  step?: string;
  min?: string;
}) {
  return (
    <div>
      <Label text={label} />
      <input
        type="number"
        step={step}
        min={min}
        className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-ring"
        placeholder={placeholder}
        value={value ?? ""}
        onChange={(e) => {
          const parsed = parseFloat(e.target.value);
          onChange(Number.isFinite(parsed) ? parsed : optional ? undefined : 0);
        }}
      />
    </div>
  );
}

function weightedRr(form: TradeInput): number {
  if (form.stopLossPct <= 0) return 0;
  const legs = [
    { pct: form.tp1Pct ?? 0, weight: form.tp1PositionPct },
    { pct: form.tp2Pct ?? 0, weight: form.tp2PositionPct },
    { pct: form.tp3Pct ?? 0, weight: form.tp3PositionPct },
  ].filter((leg) => leg.pct > 0 && leg.weight > 0);
  const weightTotal = legs.reduce((sum, leg) => sum + leg.weight, 0);
  if (!weightTotal) return 0;
  return legs.reduce((sum, leg) => sum + (leg.pct / form.stopLossPct) * (leg.weight / weightTotal), 0);
}

type View = "form" | "result";

export default function TradeEntry() {
  const [form, setForm] = useState<TradeInput>(DEFAULTS);
  const [view, setView] = useState<View>("form");
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [allocatedAmountUsd, setAllocatedAmountUsd] = useState("");
  const [, setLocation] = useLocation();
  const { addTrade } = useTrades();
  const { addToWatchlist } = useWatchlist();
  const { settings } = useSettings();

  const set = <K extends keyof TradeInput>(key: K, val: TradeInput[K]) =>
    setForm((p) => ({ ...p, [key]: val }));

  const validForm = form.coin.trim().length > 0 && form.stopLossPct > 0;

  const handleScore = () => {
    if (!validForm) return;
    const scored = scoreTradeInput(form, settings);
    setResult(scored);
    const targetAmount = Math.round(settings.totalCapital * (scored.suggestedAllocationPct / 100) * 100) / 100;
    setAllocatedAmountUsd(String(targetAmount));
    setView("result");
  };

  const handleLogTrade = async () => {
    if (!result) return;
    if (result.presentation?.dominantState === "hard_reject") return;
    const parsedAllocated = parseFloat(allocatedAmountUsd);
    const allocationValue = Number.isFinite(parsedAllocated) && parsedAllocated > 0 ? parsedAllocated : undefined;

    const loggedAt = new Date().toISOString();
    await addTrade({
      ...form,
      ...result,
      allocatedAmountUsd: allocationValue,
      id: `t-${Date.now()}`,
      createdAt: loggedAt,
    });
    setForm(DEFAULTS);
    setResult(null);
    setAllocatedAmountUsd("");
    setView("form");
    setLocation("/journal");
  };

  const handleAddToWatchlist = async () => {
    if (!result) return;
    const savedAt = new Date().toISOString();
    await addToWatchlist({
      ...form,
      ...result,
      id: `w-${Date.now()}`,
      createdAt: savedAt,
    });
    setForm(DEFAULTS);
    setResult(null);
    setAllocatedAmountUsd("");
    setView("form");
    setLocation("/watchlist");
  };

  const handleDiscard = () => {
    setView("form");
    setResult(null);
  };

  if (view === "result" && result) {
    const capital = settings.totalCapital;
    const allocationBandByStatus: Record<string, { min: number; max: number }> = {
      "Standard Trade": { min: 10, max: 18 },
      "High Conviction Trade": { min: 20, max: 35 },
      "Expansion Trade": { min: 35, max: 60 },
      "Balanced Trade": { min: 10, max: 18 },
      "Aggressive Trade": { min: 20, max: 35 },
      "Asymmetric Swing Trade": { min: 35, max: 60 },
    };
    const allocationBand = allocationBandByStatus[result.tradeStatus];
    const minAllocationUsd = allocationBand ? Math.round(capital * (allocationBand.min / 100) * 100) / 100 : 0;
    const maxAllocationUsd = allocationBand ? Math.round(capital * (allocationBand.max / 100) * 100) / 100 : 0;

    return (
      <div className="p-6 space-y-5 max-w-3xl mx-auto">
        <button
          type="button"
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={handleDiscard}
        >
          <ArrowLeft size={12} />
          Back to form
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-semibold text-muted-foreground">Decision terminal</h1>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">
              {form.coin} / {form.setupType} / {form.marketCapTier}
            </p>
          </div>
          <CapitalSummary />
        </div>

        {result.presentation ? (
          <DecisionTerminal
            form={form}
            result={result}
            presentation={result.presentation}
            capital={capital}
            minAllocationUsd={minAllocationUsd}
            maxAllocationUsd={maxAllocationUsd}
            allocatedAmountUsd={allocatedAmountUsd}
            setAllocatedAmountUsd={setAllocatedAmountUsd}
            onLogTrade={handleLogTrade}
            onWatchlist={handleAddToWatchlist}
            onDiscard={handleDiscard}
          />
        ) : null}
      </div>
    );
  }

  const rr = weightedRr(form);

  return (
    <div className="p-6 space-y-4 w-full min-w-0">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-semibold">New Trade</h1>
        <CapitalSummary />
      </div>

      <div className="space-y-5 w-full">
        <SectionDivider label="A — Trade Identity" />
        <div className={FORM_GRID}>
          <div>
            <Label text="Coin / Pair" />
            <input
              className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm font-mono text-foreground placeholder-muted-foreground focus:outline-none focus:border-ring uppercase"
              placeholder="BTC/USD"
              value={form.coin}
              onChange={(e) => set("coin", e.target.value.toUpperCase())}
            />
          </div>
          <Select label="Setup Type" value={form.setupType} onChange={(v) => set("setupType", v as SetupType)} options={["Breakout Retest", "Double Bottom", "Trend Continuation", "Trendline Reclaim"]} />
          <Select label="Narrative Category" value={form.narrativeCategory} onChange={(v) => set("narrativeCategory", v as NarrativeCategory)} options={["AI", "DeFi", "Gaming", "Meme", "Layer 1", "Layer 2", "RWA", "Other"]} />
        </div>
        <div className={FORM_GRID}>
          <Select label="Market Cap Tier" value={form.marketCapTier} onChange={(v) => set("marketCapTier", v as MarketCapTier)} options={["Small Cap", "Mid Cap", "Large Cap"]} />
        </div>

        <SectionDivider label="B — Market Regime" />
        <div className={FORM_GRID}>
          <Select label="BTC Trend" value={form.btcTrend} onChange={(v) => set("btcTrend", v as MarketTrend)} options={MARKET_TREND_OPTIONS} />
          <Select label="Alts Trend" value={form.altTrend} onChange={(v) => set("altTrend", v as MarketTrend)} options={MARKET_TREND_OPTIONS} />
          <Select label="BTC Volatility" value={form.btcVolatilityState} onChange={(v) => set("btcVolatilityState", v as BtcVolatilityState)} options={["Calm", "Elevated", "Violent"]} />
        </div>
        <div className={FORM_GRID}>
          <Select label="Narrative Heat" value={form.narrativeHeat} onChange={(v) => set("narrativeHeat", v as NarrativeHeat)} options={["Dead", "Weak", "Active", "Hot", "Euphoric"]} />
        </div>

        <SectionDivider label="C — Token Structure" />
        <div className={FORM_GRID}>
          <Select label="Higher TF Structure" value={form.tokenHigherTfStructure} onChange={(v) => set("tokenHigherTfStructure", v as TokenMarketStructure)} options={TOKEN_STRUCTURE_OPTIONS} />
          <Select label="Mid TF Structure" value={form.tokenMidTfStructure} onChange={(v) => set("tokenMidTfStructure", v as TokenMarketStructure)} options={TOKEN_STRUCTURE_OPTIONS} />
          <Select label="Lower TF Structure" value={form.tokenLowerTfStructure} onChange={(v) => set("tokenLowerTfStructure", v as TokenMarketStructure)} options={TOKEN_STRUCTURE_OPTIONS} />
        </div>

        <SectionDivider label="D — Momentum" />
        <div className={FORM_GRID}>
          <Select label="Volume State" value={form.volumeState} onChange={(v) => set("volumeState", v as VolumeState)} options={["Weak", "Normal", "Expansion", "Extreme Expansion"]} />
          <Select label="Relative Volume" value={form.relativeVolume} onChange={(v) => set("relativeVolume", v as RelativeVolume)} options={["Below Average", "Average", "High", "Extreme"]} />
          <Select label="Post Breakout" value={form.postBreakoutBehavior} onChange={(v) => set("postBreakoutBehavior", v as PostBreakoutBehavior)} options={["Immediate Continuation", "Holding", "Stalling", "Failing"]} />
        </div>

        <SectionDivider label="E — Entry & Execution" />
        <div className={FORM_GRID}>
          <NumberInput label="Stop Loss %" value={form.stopLossPct} onChange={(v) => set("stopLossPct", v ?? 0)} placeholder="2.5" />
          <NumberInput label="TP1 %" value={form.tp1Pct} onChange={(v) => set("tp1Pct", v)} optional placeholder="5" />
          <NumberInput label="TP2 %" value={form.tp2Pct} onChange={(v) => set("tp2Pct", v)} optional placeholder="10" />
        </div>
        <div className={FORM_GRID}>
          <NumberInput label="TP3 %" value={form.tp3Pct} onChange={(v) => set("tp3Pct", v)} optional placeholder="15" />
          <NumberInput label="TP1 Position %" value={form.tp1PositionPct} onChange={(v) => set("tp1PositionPct", v ?? 0)} placeholder="40" step="1" />
          <NumberInput label="TP2 Position %" value={form.tp2PositionPct} onChange={(v) => set("tp2PositionPct", v ?? 0)} placeholder="40" step="1" />
        </div>
        <div className={FORM_GRID}>
          <NumberInput label="TP3 Position %" value={form.tp3PositionPct} onChange={(v) => set("tp3PositionPct", v ?? 0)} placeholder="20" step="1" />
          <Select label="Entry Location" value={form.entryLocation} onChange={(v) => set("entryLocation", v as EntryLocation)} options={["At Key Level", "Slightly Extended", "Chased"]} />
          <div className="border border-border rounded-sm px-3 py-2 text-xs font-mono text-muted-foreground flex items-center">
            Weighted RR: {rr > 0 ? `${rr.toFixed(2)}R` : "Add targets"}
          </div>
        </div>

        <SectionDivider label="F — Risk Stack" />
        <div className={FORM_GRID}>
          <Select label="Overextension" value={form.overextension} onChange={(v) => set("overextension", v as Overextension)} options={["Calm", "Extended", "Euphoric"]} />
          <Select label="Event Risk" value={form.eventRisk} onChange={(v) => set("eventRisk", v as EventRisk)} options={["Low", "Medium", "High"]} />
          <Select label="Liquidity Stability" value={form.liquidityStability} onChange={(v) => set("liquidityStability", v as LiquidityStability)} options={["Stable", "Moderate", "Thin", "Dangerous"]} />
        </div>

        <SectionDivider label="G — Trade Management" />
        <div className={FORM_GRID}>
          <Select label="Move SL Rule" value={form.moveSlRule} onChange={(v) => set("moveSlRule", v as MoveSlRule)} options={["Never", "After TP1", "After Structure Shift", "Manual"]} />
          <Select label="Invalidation Type" value={form.invalidationType} onChange={(v) => set("invalidationType", v as InvalidationType)} options={["Structure Loss", "Support Loss", "Volume Failure", "BTC Weakness"]} />
        </div>

        <div>
          <Label text="Raw Observation Notes (optional)" />
          <textarea
            className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm font-mono text-foreground placeholder-muted-foreground focus:outline-none focus:border-ring resize-none"
            rows={3}
            placeholder="Structure notes, orderflow observations..."
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </div>

        <button
          className={`w-full py-2.5 text-sm font-mono rounded-sm transition-opacity ${
            !validForm
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-foreground text-background hover:opacity-90"
          }`}
          onClick={handleScore}
          disabled={!validForm}
        >
          Score Setup
        </button>
      </div>
    </div>
  );
}
