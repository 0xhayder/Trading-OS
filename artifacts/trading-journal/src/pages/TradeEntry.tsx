import { useState } from "react";
import { useLocation } from "wouter";
import { useSettings, useTrades, useWatchlist } from "@/lib/store";
import { scoreTradeInput } from "@/lib/scorer";
import type { TradeInput, ScoreResult, SetupType, Timeframe, MarketCondition, NarrativeStrength, LevelClarity, TfAlignment, RetestQuality, VolumeStrength, CandleImpulse, FollowThrough, EntryDistance, SpaceToResistance, RRQuality, Overextension, EventRisk, LiquidityRisk } from "@/lib/types";
import { ArrowLeft } from "lucide-react";
import { DecisionTerminal } from "@/components/DecisionTerminal";

const DEFAULTS: TradeInput = {
  coin: "",
  setupType: "Breakout Retest",
  timeframe: "Daily",
  btcCondition: "Neutral",
  altCondition: "Neutral",
  narrativeStrength: "Active",
  levelClarity: "Clean",
  timeframeAlignment: "Partially Aligned",
  retestQuality: "Decent",
  volumeStrength: "Normal",
  candleImpulse: "Strong",
  followThrough: "Slowing",
  stopLossPct: 3,
  tp1Pct: 6,
  tp2Pct: 12,
  entryDistance: "Decent",
  spaceToResistance: "Decent Space",
  rrQuality: "RR 2 to 3",
  overextension: "Calm",
  eventRisk: "Low",
  liquidityRisk: "Acceptable",
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

function Select({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <Label text={label} />
      <select
        className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-ring cursor-pointer appearance-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}

function NumberInput({ label, value, onChange, placeholder }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <Label text={label} />
      <input
        type="number"
        step="0.1"
        min="0"
        className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-ring"
        placeholder={placeholder}
        value={value || ""}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      />
    </div>
  );
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

  const handleScore = () => {
    if (!form.coin.trim()) return;
    const scored = scoreTradeInput(form, settings);
    setResult(scored);
    const targetAmount = Math.round((settings.totalCapital * (scored.suggestedAllocationPct / 100)) * 100) / 100;
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
    const minAllocationUsd = allocationBand
      ? Math.round((capital * (allocationBand.min / 100)) * 100) / 100
      : 0;
    const maxAllocationUsd = allocationBand
      ? Math.round((capital * (allocationBand.max / 100)) * 100) / 100
      : 0;

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

        <div>
          <h1 className="text-sm font-semibold text-muted-foreground">Decision terminal</h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-mono">
            {form.coin} · {form.setupType} · {form.timeframe}
          </p>
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
        ) : (
          <div className="text-sm text-muted-foreground border border-border rounded-sm p-4">
            This saved result has no presentation layer. Re-score the setup to see the new terminal.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-sm font-semibold">New Trade</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Fill all fields, then submit to score</p>
      </div>

      <div className="space-y-5">
        <SectionDivider label="1 — Basic Info" />
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label text="Coin / Pair" />
            <input
              className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm font-mono text-foreground placeholder-muted-foreground focus:outline-none focus:border-ring uppercase"
              placeholder="TAO/USDT"
              value={form.coin}
              onChange={(e) => set("coin", e.target.value.toUpperCase())}
            />
          </div>
          <Select
            label="Setup Type"
            value={form.setupType}
            onChange={(v) => set("setupType", v as SetupType)}
            options={["Breakout Retest", "Double Bottom", "Trendline Reclaim", "Trend Continuation"]}
          />
          <Select
            label="Timeframe"
            value={form.timeframe}
            onChange={(v) => set("timeframe", v as Timeframe)}
            options={["4H", "Daily", "Weekly"]}
          />
        </div>

        <SectionDivider label="2 — Market" />
        <div className="grid grid-cols-3 gap-4">
          <Select label="BTC Condition" value={form.btcCondition} onChange={(v) => set("btcCondition", v as MarketCondition)} options={["Strong Bullish", "Bullish", "Neutral", "Bearish", "Strong Bearish"]} />
          <Select label="Alt Condition" value={form.altCondition} onChange={(v) => set("altCondition", v as MarketCondition)} options={["Strong Bullish", "Bullish", "Neutral", "Bearish", "Strong Bearish"]} />
          <Select label="Narrative" value={form.narrativeStrength} onChange={(v) => set("narrativeStrength", v as NarrativeStrength)} options={["Hot", "Active", "Neutral", "Weak", "Dead"]} />
        </div>

        <SectionDivider label="3 — Structure" />
        <div className="grid grid-cols-3 gap-4">
          <Select label="Level Clarity" value={form.levelClarity} onChange={(v) => set("levelClarity", v as LevelClarity)} options={["Extremely Obvious", "Clean", "Medium", "Forced / Messy"]} />
          <Select label="TF Alignment" value={form.timeframeAlignment} onChange={(v) => set("timeframeAlignment", v as TfAlignment)} options={["Fully Aligned", "Partially Aligned", "Counter Trend"]} />
          <Select label="Retest Quality" value={form.retestQuality} onChange={(v) => set("retestQuality", v as RetestQuality)} options={["Strong", "Decent", "Weak", "None"]} />
        </div>

        <SectionDivider label="4 — Momentum" />
        <div className="grid grid-cols-3 gap-4">
          <Select label="Volume" value={form.volumeStrength} onChange={(v) => set("volumeStrength", v as VolumeStrength)} options={["Strong Expansion", "Normal", "Weak"]} />
          <Select label="Candle Impulse" value={form.candleImpulse} onChange={(v) => set("candleImpulse", v as CandleImpulse)} options={["Explosive", "Strong", "Weak"]} />
          <Select label="Follow Through" value={form.followThrough} onChange={(v) => set("followThrough", v as FollowThrough)} options={["Continuation Present", "Slowing", "Failing"]} />
        </div>

        <SectionDivider label="5 — Entry" />
        <div className="grid grid-cols-3 gap-4">
          <NumberInput label="Stop Loss %" value={form.stopLossPct} onChange={(v) => set("stopLossPct", v)} placeholder="3.5" />
          <NumberInput label="TP1 %" value={form.tp1Pct} onChange={(v) => set("tp1Pct", v)} placeholder="7" />
          <NumberInput label="TP2 %" value={form.tp2Pct} onChange={(v) => set("tp2Pct", v)} placeholder="14" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Select label="Entry Distance" value={form.entryDistance} onChange={(v) => set("entryDistance", v as EntryDistance)} options={["Perfect", "Decent", "Chased"]} />
          <Select label="Space to Resistance" value={form.spaceToResistance} onChange={(v) => set("spaceToResistance", v as SpaceToResistance)} options={["Large Space", "Decent Space", "Limited Space"]} />
          <Select label="RR Quality" value={form.rrQuality} onChange={(v) => set("rrQuality", v as RRQuality)} options={["RR > 5", "RR 3 to 5", "RR 2 to 3", "RR < 2"]} />
        </div>

        <SectionDivider label="6 — Risk" />
        <div className="grid grid-cols-3 gap-4">
          <Select label="Overextension" value={form.overextension} onChange={(v) => set("overextension", v as Overextension)} options={["Calm", "Extended", "Euphoric"]} />
          <Select label="Event Risk" value={form.eventRisk} onChange={(v) => set("eventRisk", v as EventRisk)} options={["Low", "Medium", "High"]} />
          <Select label="Liquidity" value={form.liquidityRisk} onChange={(v) => set("liquidityRisk", v as LiquidityRisk)} options={["High Liquidity", "Acceptable", "Dangerous"]} />
        </div>

        <div>
          <Label text="Notes (optional)" />
          <textarea
            className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm font-mono text-foreground placeholder-muted-foreground focus:outline-none focus:border-ring resize-none"
            rows={3}
            placeholder="Setup context, key levels, reason for entry..."
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </div>

        <button
          className={`w-full py-2.5 text-sm font-mono rounded-sm transition-opacity ${
            !form.coin.trim()
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-foreground text-background hover:opacity-90"
          }`}
          onClick={handleScore}
          disabled={!form.coin.trim()}
        >
          Score Setup
        </button>
      </div>
    </div>
  );
}
