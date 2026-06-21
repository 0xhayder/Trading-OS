import { useState } from "react";
import { useLocation } from "wouter";
import CapitalSummary from "@/components/CapitalSummary";
import { analyzeSimilarTrades, weightedRr, type SimilarityResult } from "@/lib/scorer";
import { useSettings, useTrades, useWatchlist, useCapitalAdjustments } from "@/lib/store";
import { totalCapitalAdjustmentsUsd, totalRealizedUsd } from "@/lib/portfolioMetrics";
import type { MarketCapTier, MarketTrend, NarrativeCategory, NarrativeHeat, SetupType, TradeInput, TradeTimeframe } from "@/lib/types";
import { ArrowLeft, Tag } from "lucide-react";

const FORM_GRID = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3";
const SETUPS = ["Breakout Retest", "Double Bottom", "Trend Continuation", "Trendline Reclaim", "Other"] as const;
const MARKET_TRENDS = ["Extreme Bullish", "Bullish", "Neutral", "Bearish", "Extreme Bearish"] as const;
const NARRATIVE_STRENGTH = ["Dead", "Weak", "Neutral", "Active", "Hot"] as const;
const NARRATIVE_CATEGORIES = ["AI", "DeFi", "RWA", "Infrastructure", "Gaming", "Meme", "Other"] as const;
const MARKET_CAPS = ["Micro Cap", "Small Cap", "Mid Cap", "Large Cap"] as const;
const TIMEFRAMES = ["Weekly", "Daily", "4H", "1H"] as const;

const DEFAULTS: TradeInput = {
  coin: "",
  setupType: "Breakout Retest",
  narrativeCategory: "AI",
  marketCapTier: "Mid Cap",
  timeframe: "Daily",
  btcTrend: "Neutral",
  altTrend: "Neutral",
  btcVolatilityState: "Calm",
  narrativeHeat: "Neutral",
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
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  placeholder?: string;
  optional?: boolean;
  step?: string;
}) {
  return (
    <div>
      <Label text={label} />
      <input
        type="number"
        step={step}
        min="0"
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

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="border border-border rounded-sm p-3">
      <div className="section-label mb-1">{label}</div>
      <div className={`font-mono text-lg font-semibold ${color ?? "text-foreground"}`}>{value}</div>
    </div>
  );
}

function pct(value: number, signed = false) {
  const prefix = signed && value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}%`;
}

function tone(value: number) {
  return value > 0 ? "text-green-400" : value < 0 ? "text-red-400" : undefined;
}

type View = "form" | "result";

export default function TradeEntry() {
  const [form, setForm] = useState<TradeInput>(DEFAULTS);
  const [customSetup, setCustomSetup] = useState("");
  const [view, setView] = useState<View>("form");
  const [result, setResult] = useState<SimilarityResult | null>(null);
  const [amountUsd, setAmountUsd] = useState("");
  const [capitalPct, setCapitalPct] = useState("");
  const [, setLocation] = useLocation();
  const { trades, addTrade } = useTrades();
  const { addToWatchlist } = useWatchlist();
  const { settings } = useSettings();
  const { adjustments } = useCapitalAdjustments();

  const closedTrades = trades.filter((t) => t.outcome && t.actualPnlPct != null);
  const tradingPnlUsd = totalRealizedUsd(closedTrades);
  const adjustmentsNetUsd = totalCapitalAdjustmentsUsd(adjustments);
  const liveCapital = settings.totalCapital + tradingPnlUsd + adjustmentsNetUsd;

  const set = <K extends keyof TradeInput>(key: K, val: TradeInput[K]) =>
    setForm((p) => ({ ...p, [key]: val }));

  const resolvedSetup = form.setupType === "Other" ? customSetup.trim() : form.setupType;
  const validForm = form.coin.trim().length > 0 && resolvedSetup.length > 0 && form.stopLossPct > 0;
  const rr = weightedRr({ ...form, setupType: resolvedSetup });

  const handleSubmit = () => {
    if (!validForm) return;
    const normalizedForm = { ...form, coin: form.coin.trim().toUpperCase(), setupType: resolvedSetup };
    setForm(normalizedForm);
    setResult(analyzeSimilarTrades(normalizedForm, trades));
    setView("result");
  };

  const resetForm = () => {
    setForm(DEFAULTS);
    setCustomSetup("");
    setResult(null);
    setAmountUsd("");
    setCapitalPct("");
    setView("form");
  };

  const parsedAmountUsd = parseFloat(amountUsd);
  const parsedCapitalPct = parseFloat(capitalPct);
  const allocatedAmountUsd = Number.isFinite(parsedAmountUsd) && parsedAmountUsd > 0 ? parsedAmountUsd : undefined;

  const handleAmountUsdChange = (raw: string) => {
    setAmountUsd(raw);
    const n = parseFloat(raw);
    if (!raw.trim()) {
      setCapitalPct("");
      return;
    }
    if (liveCapital > 0 && Number.isFinite(n)) {
      setCapitalPct(((n / liveCapital) * 100).toFixed(2));
    }
  };

  const handleCapitalPctChange = (raw: string) => {
    setCapitalPct(raw);
    const n = parseFloat(raw);
    if (!raw.trim()) {
      setAmountUsd("");
      return;
    }
    if (liveCapital > 0 && Number.isFinite(n)) {
      setAmountUsd(((n / 100) * liveCapital).toFixed(2));
    }
  };

  const tradePayload = () => ({
    ...form,
    ...result!,
    scoreBreakdown: {
      ...result!.scoreBreakdown,
      accountCapitalAtEntryUsd: liveCapital,
      ...(Number.isFinite(parsedCapitalPct) ? { allocatedCapitalPct: parsedCapitalPct } : {}),
    },
    allocatedAmountUsd,
    id: `t-${Date.now()}`,
    createdAt: new Date().toISOString(),
  });

  const saveJournal = async () => {
    if (!result) return;
    await addTrade(tradePayload());
    resetForm();
    setLocation("/journal");
  };

  const saveWatchlist = async () => {
    if (!result) return;
    const createdAt = new Date().toISOString();
    await addToWatchlist({
      ...form,
      ...result,
      scoreBreakdown: { ...result.scoreBreakdown, accountCapitalAtEntryUsd: liveCapital },
      id: `w-${Date.now()}`,
      createdAt,
    });
    resetForm();
    setLocation("/watchlist");
  };

  if (view === "result" && result?.historicalSnapshot) {
    const s = result.historicalSnapshot;

    return (
      <div className="p-6 space-y-5 max-w-4xl mx-auto">
        <button
          type="button"
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setView("form")}
        >
          <ArrowLeft size={12} />
          Back to form
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-semibold">Historical Insight</h1>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">
              {form.coin} / {form.setupType} / {form.timeframe}
            </p>
          </div>
          <CapitalSummary />
        </div>

        <section className="border border-border rounded-sm p-4 space-y-4">
          <div className="section-label">Historical Matches</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Stat label="Similar Trades Found" value={String(s.similarTradesFound)} />
            <Stat label="Average Similarity" value={pct(s.averageSimilarityPct)} />
          </div>
        </section>

        <section className="border border-border rounded-sm p-4 space-y-4">
          <div className="section-label">Similarity Breakdown</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Stat label="Near Matches" value={String(s.nearMatches)} />
            <Stat label="Strong Matches" value={String(s.strongMatches)} />
            <Stat label="Loose Matches" value={String(s.looseMatches)} />
          </div>
        </section>

        <section className="border border-border rounded-sm p-4 space-y-4">
          <div className="section-label">Historical Performance</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Stat label="Historical Win Rate" value={pct(s.historicalWinRate)} />
            <Stat label="Historical Breakeven Rate" value={pct(s.historicalBreakevenRate)} />
            <Stat label="Historical Loss Rate" value={pct(s.historicalLossRate)} />
            <Stat label="Average Return" value={pct(s.averageReturnPct, true)} color={tone(s.averageReturnPct)} />
            <Stat label="Best Historical Trade" value={s.bestHistoricalTradePct == null ? "-" : pct(s.bestHistoricalTradePct, true)} color="text-green-400" />
            <Stat label="Worst Historical Trade" value={s.worstHistoricalTradePct == null ? "-" : pct(s.worstHistoricalTradePct, true)} color="text-red-400" />
          </div>
        </section>

        <section className="border border-border rounded-sm p-4 space-y-4">
          <div className="section-label">Expected Outcome</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Stat label="Expected Return" value={pct(s.expectedReturnPct, true)} color={tone(s.expectedReturnPct)} />
            <Stat label="Weighted Historical Win Rate" value={pct(s.weightedHistoricalWinRate)} />
            <Stat label="Confidence Level" value={s.confidenceLevel} />
          </div>
        </section>

        <section className="border border-border rounded-sm p-4 space-y-4">
          <div className="section-label">Position Size</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label text="Amount (USD)" />
              <input
                type="number"
                step="0.01"
                min="0"
                className="w-full bg-background border border-border rounded-sm px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-ring"
                placeholder={`e.g. ${(liveCapital * 0.1).toFixed(0)}`}
                value={amountUsd}
                onChange={(e) => handleAmountUsdChange(e.target.value)}
              />
            </div>
            <div>
              <Label text="Capital %" />
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                className="w-full bg-background border border-border rounded-sm px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-ring"
                placeholder="e.g. 10"
                value={capitalPct}
                onChange={(e) => handleCapitalPctChange(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground mt-1.5 font-mono">
                Based on ${liveCapital.toLocaleString(undefined, { maximumFractionDigits: 0 })} live capital
              </p>
            </div>
          </div>
        </section>

        <div className="flex gap-2 w-full pt-1">
          <button
            type="button"
            style={{ flex: "70 70 0%" }}
            className="py-3.5 text-sm font-semibold font-mono rounded-sm bg-emerald-600/80 text-white hover:bg-emerald-600 transition-colors"
            onClick={saveJournal}
          >
            Log Trade
          </button>
          <button
            type="button"
            title="Save to Watchlist"
            aria-label="Save to Watchlist"
            style={{ flex: "5 5 0%" }}
            className="py-3.5 flex items-center justify-center border border-border rounded-sm text-muted-foreground hover:text-foreground hover:border-ring transition-colors min-w-12"
            onClick={saveWatchlist}
          >
            <Tag size={18} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            style={{ flex: "25 25 0%" }}
            className="py-3.5 text-sm font-mono border border-border rounded-sm text-muted-foreground hover:text-foreground hover:border-ring transition-colors"
            onClick={resetForm}
          >
            Discard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 w-full min-w-0">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-semibold">New Trade</h1>
        <CapitalSummary />
      </div>

      <div className="space-y-5 w-full">
        <SectionDivider label="Basic Info" />
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
          <Select label="Setup Type" value={SETUPS.includes(form.setupType as never) ? form.setupType : "Other"} onChange={(v) => set("setupType", v as SetupType)} options={SETUPS} />
          {form.setupType === "Other" && (
            <div>
              <Label text="Other Setup Type" />
              <input
                className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-ring"
                value={customSetup}
                onChange={(e) => setCustomSetup(e.target.value)}
              />
            </div>
          )}
          <Select label="Market Cap Tier" value={form.marketCapTier} onChange={(v) => set("marketCapTier", v as MarketCapTier)} options={MARKET_CAPS} />
          <Select label="Timeframe" value={form.timeframe} onChange={(v) => set("timeframe", v as TradeTimeframe)} options={TIMEFRAMES} />
        </div>

        <SectionDivider label="Market Conditions" />
        <div className={FORM_GRID}>
          <Select label="BTC Condition" value={form.btcTrend} onChange={(v) => set("btcTrend", v as MarketTrend)} options={MARKET_TRENDS} />
          <Select label="Alt Market Condition" value={form.altTrend} onChange={(v) => set("altTrend", v as MarketTrend)} options={MARKET_TRENDS} />
          <Select label="Narrative Strength" value={form.narrativeHeat} onChange={(v) => set("narrativeHeat", v as NarrativeHeat)} options={NARRATIVE_STRENGTH} />
          <Select label="Narrative Category" value={form.narrativeCategory} onChange={(v) => set("narrativeCategory", v as NarrativeCategory)} options={NARRATIVE_CATEGORIES} />
        </div>

        <SectionDivider label="Trade Plan" />
        <div className={FORM_GRID}>
          <NumberInput label="Stop Loss %" value={form.stopLossPct} onChange={(v) => set("stopLossPct", v ?? 0)} placeholder="2.5" />
          <NumberInput label="TP1 %" value={form.tp1Pct} onChange={(v) => set("tp1Pct", v)} optional placeholder="5" />
          <NumberInput label="TP1 Allocation %" value={form.tp1PositionPct} onChange={(v) => set("tp1PositionPct", v ?? 0)} step="1" />
          <NumberInput label="TP2 %" value={form.tp2Pct} onChange={(v) => set("tp2Pct", v)} optional placeholder="10" />
          <NumberInput label="TP2 Allocation %" value={form.tp2PositionPct} onChange={(v) => set("tp2PositionPct", v ?? 0)} step="1" />
          <NumberInput label="TP3 %" value={form.tp3Pct} onChange={(v) => set("tp3Pct", v)} optional placeholder="15" />
          <NumberInput label="TP3 Allocation %" value={form.tp3PositionPct} onChange={(v) => set("tp3PositionPct", v ?? 0)} step="1" />
          <div className="border border-border rounded-sm px-3 py-2 text-xs font-mono text-muted-foreground flex items-center">
            RR: {rr > 0 ? `${rr.toFixed(2)}R` : "Add targets"}
          </div>
        </div>

        <SectionDivider label="Notes" />
        <div>
          <Label text="Entry Notes" />
          <textarea
            className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm font-mono text-foreground placeholder-muted-foreground focus:outline-none focus:border-ring resize-none"
            rows={4}
            placeholder="Entry context, chart notes, plan..."
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </div>

        <button
          className={`w-full py-2.5 text-sm font-mono rounded-sm transition-opacity ${
            !validForm ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-foreground text-background hover:opacity-90"
          }`}
          onClick={handleSubmit}
          disabled={!validForm}
        >
          Submit Trade
        </button>
      </div>
    </div>
  );
}
