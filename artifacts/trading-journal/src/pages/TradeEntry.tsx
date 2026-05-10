import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useTrades } from "@/lib/store";
import { scoreTradeInput } from "@/lib/scorer";
import type { TradeInput, TradeScore } from "@/lib/types";
import { AlertTriangle, CheckCircle, XCircle, Clock, TrendingUp } from "lucide-react";

const SETUP_TYPES = ["Breakout Retest", "Double Bottom", "Trendline Trade"];
const TIMEFRAMES = ["4H", "Daily", "Weekly"];

const DEFAULTS: TradeInput = {
  coin: "",
  setupType: "Breakout Retest",
  timeframe: "Daily",
  btcCondition: "Neutral",
  altCondition: "Neutral",
  narrativeStrength: "Active",
  levelClarity: "Decent",
  timeframeAlignment: "Partially Aligned",
  retestQuality: "Acceptable",
  volumeStrength: "Normal",
  candleImpulse: "Medium",
  followThrough: "Slowing",
  stopLossPct: 3,
  tp1Pct: 6,
  tp2Pct: 12,
  entryDistance: "Acceptable",
  spaceToResistance: "Decent Space",
  rrQuality: "Acceptable",
  overextension: "Calm",
  eventRisk: "Low",
  liquidityRisk: "Acceptable",
  notes: "",
  mode: "trade",
};

function DropField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <div>
      <div className="section-label mb-1.5">{label}</div>
      <select
        className="w-full bg-background border border-input rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:border-ring font-mono appearance-none cursor-pointer"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function NumField({ label, value, onChange, placeholder, suffix }: {
  label: string; value: number; onChange: (v: number) => void; placeholder?: string; suffix?: string;
}) {
  return (
    <div>
      <div className="section-label mb-1.5">{label}{suffix && <span className="text-muted-foreground/60"> ({suffix})</span>}</div>
      <input
        type="number"
        step="0.1"
        min="0"
        className="w-full bg-background border border-input rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:border-ring font-mono"
        placeholder={placeholder}
        value={value || ""}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      />
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <span className="section-label">{label}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

const STATUS_CONFIG = {
  "Reject": { icon: XCircle, color: "text-red-400", border: "border-red-400/20", bg: "bg-red-400/5" },
  "Watchlist": { icon: Clock, color: "text-yellow-500", border: "border-yellow-500/20", bg: "bg-yellow-500/5" },
  "Standard Trade": { icon: CheckCircle, color: "text-foreground", border: "border-border", bg: "bg-accent/30" },
  "High Conviction": { icon: TrendingUp, color: "text-green-400", border: "border-green-400/20", bg: "bg-green-400/5" },
  "Expansion Trade": { icon: TrendingUp, color: "text-green-400", border: "border-green-400/20", bg: "bg-green-400/5" },
};

function ScoreBar({ score }: { score: number }) {
  const pct = score;
  const color = score < 40 ? "bg-red-400" : score < 55 ? "bg-yellow-500" : score < 68 ? "bg-foreground/50" : "bg-green-400";
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="section-label">Final Score</span>
        <span className="font-mono text-2xl font-bold text-foreground">{score}<span className="text-sm text-muted-foreground font-normal">/100</span></span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function TradeEntry() {
  const [form, setForm] = useState<TradeInput>(DEFAULTS);
  const [score, setScore] = useState<TradeScore | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const { addTrade } = useTrades();
  const [, setLocation] = useLocation();

  const set = <K extends keyof TradeInput>(key: K, value: TradeInput[K]) =>
    setForm((p) => ({ ...p, [key]: value }));

  useEffect(() => {
    const s = scoreTradeInput(form);
    setScore(s);
  }, [form]);

  const handleSubmit = () => {
    if (!form.coin.trim() || !score) return;
    const trade = {
      ...form,
      ...score,
      id: `t-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: "open" as const,
    };
    addTrade(trade);
    setSubmitted(true);
    setTimeout(() => {
      setLocation("/trade-history");
    }, 1200);
  };

  const cfg = score ? STATUS_CONFIG[score.tradeStatus] : null;

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-y-auto p-6 space-y-5 max-w-2xl">
        <div>
          <h1 className="text-base font-semibold tracking-tight">Trade Entry</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Score your setup — system output updates live</p>
        </div>

        <div className="flex items-center gap-2">
          {(["trade", "watchlist"] as const).map((m) => (
            <button
              key={m}
              className={`px-4 py-1.5 text-xs font-mono rounded-sm border transition-colors ${
                form.mode === m
                  ? "bg-foreground text-background border-foreground"
                  : "bg-transparent text-muted-foreground border-border hover:text-foreground"
              }`}
              onClick={() => set("mode", m)}
              data-testid={`button-mode-${m}`}
            >
              {m === "trade" ? "Trade" : "Watchlist"}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <SectionHeader label="1 — Basic Trade Info" />
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1">
              <div className="section-label mb-1.5">Coin / Pair</div>
              <input
                className="w-full bg-background border border-input rounded-sm px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-ring font-mono"
                placeholder="TAO/USDT"
                value={form.coin}
                onChange={(e) => set("coin", e.target.value.toUpperCase())}
                data-testid="input-coin"
              />
            </div>
            <DropField label="Setup Type" value={form.setupType} onChange={(v) => set("setupType", v)} options={SETUP_TYPES} />
            <DropField label="Timeframe" value={form.timeframe} onChange={(v) => set("timeframe", v)} options={TIMEFRAMES} />
          </div>
        </div>

        <div className="space-y-4">
          <SectionHeader label="2 — Market Factors" />
          <div className="grid grid-cols-3 gap-4">
            <DropField label="BTC Market Condition" value={form.btcCondition} onChange={(v) => set("btcCondition", v)} options={["Bullish", "Neutral", "Bearish"]} />
            <DropField label="Alt Market Condition" value={form.altCondition} onChange={(v) => set("altCondition", v)} options={["Bullish", "Neutral", "Bearish"]} />
            <DropField label="Narrative Strength" value={form.narrativeStrength} onChange={(v) => set("narrativeStrength", v)} options={["Hot", "Active", "Dead"]} />
          </div>
        </div>

        <div className="space-y-4">
          <SectionHeader label="3 — Structure Factors" />
          <div className="grid grid-cols-3 gap-4">
            <DropField label="Level Clarity" value={form.levelClarity} onChange={(v) => set("levelClarity", v)} options={["Obvious", "Decent", "Forced / Messy"]} />
            <DropField label="Timeframe Alignment" value={form.timeframeAlignment} onChange={(v) => set("timeframeAlignment", v)} options={["Fully Aligned", "Partially Aligned", "Counter Trend"]} />
            <DropField label="Retest Quality" value={form.retestQuality} onChange={(v) => set("retestQuality", v)} options={["Strong", "Acceptable", "Weak"]} />
          </div>
        </div>

        <div className="space-y-4">
          <SectionHeader label="4 — Momentum Factors" />
          <div className="grid grid-cols-3 gap-4">
            <DropField label="Volume Strength" value={form.volumeStrength} onChange={(v) => set("volumeStrength", v)} options={["Strong Expansion", "Normal", "Weak"]} />
            <DropField label="Candle Impulse" value={form.candleImpulse} onChange={(v) => set("candleImpulse", v)} options={["Strong", "Medium", "Weak"]} />
            <DropField label="Follow Through" value={form.followThrough} onChange={(v) => set("followThrough", v)} options={["Continuation Present", "Slowing", "Failing"]} />
          </div>
        </div>

        <div className="space-y-4">
          <SectionHeader label="5 — Entry Factors" />
          <div className="grid grid-cols-3 gap-4">
            <NumField label="Stop Loss %" value={form.stopLossPct} onChange={(v) => set("stopLossPct", v)} placeholder="3.5" suffix="%" />
            <NumField label="TP1 Level" value={form.tp1Pct} onChange={(v) => set("tp1Pct", v)} placeholder="7" suffix="%" />
            <NumField label="TP2 Level" value={form.tp2Pct} onChange={(v) => set("tp2Pct", v)} placeholder="14" suffix="%" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <DropField label="Entry Distance From Level" value={form.entryDistance} onChange={(v) => set("entryDistance", v)} options={["Optimal", "Acceptable", "Extended"]} />
            <DropField label="Space To Next Resistance" value={form.spaceToResistance} onChange={(v) => set("spaceToResistance", v)} options={["Large Space", "Decent Space", "Limited Space"]} />
            <DropField label="RR Quality" value={form.rrQuality} onChange={(v) => set("rrQuality", v)} options={["Asymmetric", "Acceptable", "Poor"]} />
          </div>
        </div>

        <div className="space-y-4">
          <SectionHeader label="6 — Risk Factors" />
          <div className="grid grid-cols-3 gap-4">
            <DropField label="Overextension" value={form.overextension} onChange={(v) => set("overextension", v)} options={["Calm", "Extended", "Euphoric"]} />
            <DropField label="Event Risk" value={form.eventRisk} onChange={(v) => set("eventRisk", v)} options={["Low", "Medium", "High"]} />
            <DropField label="Liquidity Risk" value={form.liquidityRisk} onChange={(v) => set("liquidityRisk", v)} options={["High Liquidity", "Acceptable", "Dangerous"]} />
          </div>
        </div>

        <div className="space-y-2">
          <div className="section-label">Notes</div>
          <textarea
            className="w-full bg-background border border-input rounded-sm px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-ring font-mono resize-none"
            rows={3}
            placeholder="Setup context, key levels, reasons for entry..."
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            data-testid="textarea-notes"
          />
        </div>

        <button
          className={`w-full py-2.5 text-sm font-mono rounded-sm transition-all ${
            submitted
              ? "bg-green-400/20 text-green-400 border border-green-400/30"
              : !form.coin.trim()
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : score && score.finalScore < 40
              ? "bg-red-400/10 text-red-400 border border-red-400/20 hover:bg-red-400/20"
              : "bg-foreground text-background hover:opacity-90"
          }`}
          onClick={handleSubmit}
          disabled={!form.coin.trim() || submitted}
          data-testid="button-submit-trade"
        >
          {submitted ? "Trade Logged" : `Log ${form.mode === "watchlist" ? "to Watchlist" : "Trade"}`}
        </button>
      </div>

      <div className="w-80 shrink-0 border-l border-border bg-card overflow-y-auto p-5 space-y-5">
        <div className="section-label">System Output</div>

        {score ? (
          <>
            <ScoreBar score={score.finalScore} />

            <div className={`border rounded-sm p-4 ${cfg?.border} ${cfg?.bg}`}>
              <div className="flex items-center gap-2 mb-1">
                {cfg && <cfg.icon size={14} className={cfg.color} />}
                <span className={`font-mono text-xs font-semibold ${cfg?.color}`}>{score.tradeStatus}</span>
              </div>
              <div className={`font-mono text-sm font-bold ${cfg?.color}`}>{score.finalDecision}</div>
            </div>

            <div className="space-y-2.5">
              {[
                { label: "Suggested Allocation", value: `${score.suggestedAllocationPct}%` },
                { label: "Suggested SL", value: `${score.suggestedSlPct}%` },
                { label: "Suggested RR", value: `${score.suggestedRr}:1` },
                { label: "Calculated Risk", value: `${score.calculatedRisk}%` },
                { label: "Expected Profit", value: `+${score.expectedProfitPct}%`, color: "text-green-400" },
                { label: "Expected Loss", value: `-${score.expectedLossPct}%`, color: "text-red-400" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between py-1 border-b border-border/50 last:border-0">
                  <span className="section-label">{label}</span>
                  <span className={`font-mono text-sm ${color ?? "text-foreground"}`}>{value}</span>
                </div>
              ))}
            </div>

            <div>
              <div className="section-label mb-2">TP Structure</div>
              <div className="text-xs font-mono text-muted-foreground leading-relaxed">{score.suggestedTpStructure}</div>
            </div>

            {score.tradeWarnings.length > 0 && (
              <div className="border border-yellow-500/20 bg-yellow-500/5 rounded-sm p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 section-label text-yellow-500/80 mb-2">
                  <AlertTriangle size={10} />
                  Trade Warnings
                </div>
                {score.tradeWarnings.map((w, i) => (
                  <div key={i} className="text-[11px] font-mono text-yellow-500/80 flex items-start gap-1.5">
                    <span className="mt-0.5 shrink-0">—</span>
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            {score.tradeWarnings.length === 0 && (
              <div className="border border-green-400/20 bg-green-400/5 rounded-sm p-3">
                <div className="text-[11px] font-mono text-green-400/80">No active warnings</div>
              </div>
            )}
          </>
        ) : (
          <div className="text-sm text-muted-foreground">Fill the form to see scoring</div>
        )}
      </div>
    </div>
  );
}
