import { useEffect, useMemo, useState } from "react";
import { computeAccountEquitySnapshot } from "@/lib/portfolioMetrics";
import { useCapitalAdjustments, useSettings, useTrades } from "@/lib/store";
import {
  Activity,
  Crosshair,
  DollarSign,
  Info,
  PieChart,
  Settings as SettingsIcon,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import CapitalSummary from "@/components/CapitalSummary";

const CLASSIFICATIONS = [
  { range: "0-44", label: "Reject Trade", note: "No deployment. Hard filters can force reject even if the raw score is higher." },
  { range: "45-59", label: "Watchlist Only", note: "Track the idea, but wait for better tape, structure, or risk conditions." },
  { range: "60-74", label: "Standard Trade", note: "Deployable base class. Nonlinear allocation band: 10-18% of equity." },
  { range: "75-87", label: "High Conviction Trade", note: "Stronger opportunity. Nonlinear allocation band: 20-35% of equity." },
  { range: "88-100", label: "Expansion Trade", note: "Top tier. Band: 35-60%, only when expansion gates and synergy rules allow it." },
];

const PIPELINE_STEPS = [
  "Hard filters run first and can reject, force watchlist, cap classification, or compress aggression.",
  "Five base layers are scored on a 0-100 execution scale using the active factor weights.",
  "Conditional rules and synergy clusters adjust the base score, eligibility, and allocation ceiling.",
  "Risk compression applies when score is uncertain, BTC and alts disagree, or risk blend is negative.",
  "Classification maps the post-filter score into Reject, Watchlist, Standard, High Conviction, or Expansion.",
  "Expansion requires synergy eligibility plus structure >80 and momentum >75.",
  "Allocation uses a nonlinear power curve, then applies structure governance, compression, and RR scaling.",
  "RR engine and warnings explain whether execution is clean, cautious, blocked, or hard rejected.",
];

const LAYERS = [
  { label: "Structure", weight: "35%", note: "Retest confirmation 40%, level clarity 35%, HTF alignment 25%. Setup type is used by hard filters and modifiers.", icon: PieChart },
  { label: "Market", weight: "25%", note: "BTC trend 45%, alt-market trend 35%, narrative strength 20%.", icon: Activity },
  { label: "Momentum", weight: "20%", note: "Volume quality 40%, candle strength 35%, follow-through 25%.", icon: Activity },
  { label: "Entry", weight: "15%", note: "Entry distance 35%, clean space to resistance 40%, RR quality 25%.", icon: Crosshair },
  { label: "Risk", weight: "5%", note: "Overextension 45%, event risk 35%, liquidity risk 20%. Negative risk compresses size.", icon: ShieldAlert },
];

const DECISION_SCREEN = [
  { state: "EXECUTE", note: "Approved path. Engine sees deployment as valid at the suggested allocation tier." },
  { state: "EXECUTE CAUTIOUSLY", note: "Approved with compression. Sizing, RR, volatility, or market disagreement requires reduced aggression." },
  { state: "WATCHLIST", note: "No deployment. Track the setup and wait for cleaner confirmation." },
  { state: "BLOCKED", note: "Score is not enough. A rule or guardrail blocks normal execution." },
  { state: "HARD REJECT", note: "A veto rule invalidated the setup before normal classification could matter." },
];

const HARD_FILTERS = [
  { id: "H1", rule: "Bearish BTC + bearish alts + breakout retest", result: "Reject" },
  { id: "H1B", rule: "Violent bearish BTC with unsafe breakout/reclaim context", result: "Reject" },
  { id: "H2", rule: "Weak retest plus messy/forced level", result: "Reject" },
  { id: "H2B", rule: "Key reclaim level lost or lower-timeframe structure bearish", result: "Reject" },
  { id: "H3", rule: "Dangerous liquidity plus euphoric extension", result: "Reject" },
  { id: "H4", rule: "Poor RR into nearby resistance", result: "Reject" },
  { id: "H5", rule: "High event risk with weak momentum", result: "Watchlist only" },
  { id: "H6", rule: "Neutral BTC, bearish alts, dead narrative", result: "Cap at Standard" },
  { id: "H7", rule: "Violent BTC volatility", result: "Cautious only, allocation cap 12%" },
];

const ALLOCATION_RULES = [
  { label: "Standard Trade", value: "10-18%", note: "Base deployable band before compression and RR scaling." },
  { label: "High Conviction", value: "20-35%", note: "Higher band, still subject to downgrade and compression checks." },
  { label: "Expansion Trade", value: "35-60%", note: "Requires expansion eligibility, structure >80, and momentum >75." },
  { label: "Curve", value: "power 1.35", note: "Higher scores scale allocation nonlinearly inside the active band." },
  { label: "Structure caps", value: "55/72/88/100%", note: "Structure below 55, 70, or 80 reduces allowed aggression." },
  { label: "Momentum haircut", value: "0.82x", note: "Momentum >80 with structure <70 is treated as isolated impulse." },
];

const GUARDRAILS = [
  "Final score is the post-filter execution score, not a simple average of the visible layer bars.",
  "Reject and watchlist classifications always return 0% allocation.",
  "Standard, High Conviction, and Expansion allocations are nonlinear, not score times a fixed percentage.",
  "Structure governs aggression: weak structure can cap size even when momentum is strong.",
  "Uncertainty band 50-65 applies 0.7x allocation compression.",
  "BTC/alt trend disagreement can step the aggression class down by one tier.",
  "Negative risk blend applies 0.75x allocation compression and tightens RR/TP expansion.",
  "RR floor is dynamic: around 15% size asks for 5R, around 50% size asks for 2R.",
  "Net capital is used for sizing hints; it does not directly change the score.",
];

export default function Settings() {
  const { settings, updateSettings } = useSettings();
  const { trades } = useTrades();
  const { adjustments, addCapitalAdjustment, deleteCapitalAdjustment } = useCapitalAdjustments();
  const [capital, setCapital] = useState("");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [saved, setSaved] = useState(false);

  const equity = useMemo(() => {
    const closed = trades.filter((t) => t.outcome && t.actualPnlPct != null);
    return computeAccountEquitySnapshot(settings.totalCapital, closed, adjustments);
  }, [settings.totalCapital, trades, adjustments]);

  useEffect(() => {
    setCapital(String(equity.baseEquityUsd));
  }, [equity.baseEquityUsd]);

  const handleSave = () => {
    const baseUsd = parseFloat(capital);
    if (!isNaN(baseUsd) && baseUsd > 0) {
      updateSettings({ totalCapital: baseUsd });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleAdjustment = (adjustmentType: "add" | "withdraw") => {
    const amountUsd = parseFloat(adjustAmount);
    if (!Number.isFinite(amountUsd) || amountUsd <= 0) return;
    void addCapitalAdjustment({ adjustmentType, amountUsd, note: adjustNote || undefined }).then(() => {
      setAdjustAmount("");
      setAdjustNote("");
    });
  };

  return (
    <div className="p-6 space-y-8 pb-12">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-muted rounded-md">
            <SettingsIcon className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <h1 className="text-base font-semibold">Settings & Reference</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Configure capital and review the active v3 engine logic</p>
          </div>
        </div>
        <CapitalSummary />
      </div>

      <div className="border border-border/60 rounded-xl bg-card/20 p-4 shadow-sm relative overflow-hidden w-full">
        <div className="absolute top-0 left-0 w-1 h-full bg-foreground/20" />

        <div className="pl-2 space-y-4 w-full min-w-0">
          <div className="flex flex-col xl:flex-row xl:items-end gap-3 w-full">
            <div className="shrink-0 w-full sm:w-40">
              <div className="text-xs font-semibold mb-1.5">Base Account Capital</div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                  <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <input
                  type="number"
                  min="1"
                  step="100"
                  className="w-full bg-background border border-border rounded-md pl-8 pr-2 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  value={capital}
                  onChange={(e) => setCapital(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Capital adjustments
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="sm:w-28 shrink-0 bg-background border border-border rounded-md px-2.5 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Amount"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                />
                <input
                  className="flex-1 min-w-0 bg-background border border-border rounded-md px-2.5 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Note (optional)"
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                />
                <button
                  type="button"
                  className="shrink-0 px-3 py-2 text-xs font-mono bg-foreground text-background rounded-md hover:opacity-90 whitespace-nowrap"
                  onClick={() => handleAdjustment("add")}
                >
                  Add
                </button>
                <button
                  type="button"
                  className="shrink-0 px-3 py-2 text-xs font-mono border border-border rounded-md text-muted-foreground hover:text-foreground whitespace-nowrap"
                  onClick={() => handleAdjustment("withdraw")}
                >
                  Withdraw
                </button>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-muted-foreground leading-relaxed flex items-start gap-2">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-70" />
            <span>
              Base equity drives account return and sizing hints. Deposits and withdrawals update net capital.
              Trading P&L is tracked separately and flows into net capital when trades close.
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div className="border border-border rounded-sm px-2.5 py-2">
              <div className="text-[10px] uppercase text-muted-foreground mb-0.5">Net capital</div>
              <div className="text-foreground">${equity.netEquityUsd.toLocaleString()}</div>
            </div>
            <div className="border border-border rounded-sm px-2.5 py-2">
              <div className="text-[10px] uppercase text-muted-foreground mb-0.5">Trading P&L</div>
              <div className={equity.tradingPnlUsd >= 0 ? "text-green-400" : "text-red-400"}>
                {equity.tradingPnlUsd >= 0 ? "+" : "-"}${Math.abs(equity.tradingPnlUsd).toLocaleString()}
              </div>
            </div>
            <div className="border border-border rounded-sm px-2.5 py-2">
              <div className="text-[10px] uppercase text-muted-foreground mb-0.5">Deposits</div>
              <div className="text-green-400/90">+${equity.depositsUsd.toLocaleString()}</div>
            </div>
            <div className="border border-border rounded-sm px-2.5 py-2">
              <div className="text-[10px] uppercase text-muted-foreground mb-0.5">Withdrawals</div>
              <div className="text-red-400/90">-${equity.withdrawalsUsd.toLocaleString()}</div>
            </div>
          </div>

          <div className="divide-y divide-border border border-border rounded-sm w-full">
            {adjustments.slice(0, 6).map((adjustment) => (
              <div key={adjustment.id} className="flex items-center justify-between gap-3 px-3 py-1.5 text-xs font-mono">
                <span className={adjustment.adjustmentType === "add" ? "text-green-400" : "text-red-400"}>
                  {adjustment.adjustmentType === "add" ? "+" : "-"}${adjustment.amountUsd.toFixed(2)}
                </span>
                <span className="text-muted-foreground flex-1 truncate">{adjustment.note || "Capital adjustment"}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground shrink-0">{new Date(adjustment.createdAt).toLocaleDateString()}</span>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-red-400 transition-colors p-1"
                    title="Delete adjustment"
                    onClick={() => deleteCapitalAdjustment(adjustment.id)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
            {adjustments.length === 0 && (
              <div className="px-3 py-3 text-xs text-muted-foreground text-center">No capital adjustments yet.</div>
            )}
          </div>

          <button
            type="button"
            className="w-full py-2 text-sm font-mono font-medium bg-foreground text-background rounded-md hover:bg-foreground/90 transition-all active:scale-[0.98] flex items-center justify-center"
            onClick={handleSave}
          >
            {saved ? "Saved" : "Save Configuration"}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="text-sm font-semibold px-1">Decision States</div>
        <p className="text-xs text-muted-foreground px-1 leading-relaxed max-w-2xl">
          The score screen headline is the real engine call. The score and layer bars explain the path, but the decision state controls deployment.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {DECISION_SCREEN.map(({ state, note }) => (
            <div key={state} className="p-4 border border-border/50 rounded-xl bg-card/10 flex flex-col gap-2 transition-colors hover:border-border/80">
              <span className="font-mono text-sm font-bold text-foreground tracking-tight">{state}</span>
              <span className="text-xs text-muted-foreground leading-relaxed">{note}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 pt-4">
        <div className="text-sm font-semibold px-1">Engine Pipeline</div>
        <div className="p-5 border border-border/50 rounded-xl bg-card/10 space-y-1">
          {PIPELINE_STEPS.map((step, idx) => (
            <div key={step} className="flex items-start gap-3 p-2 rounded-lg hover:bg-background/50 transition-colors">
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-muted/60 text-[10px] font-mono font-medium text-foreground/70 shrink-0 mt-0.5 border border-border/50">
                {idx + 1}
              </div>
              <span className="text-xs font-mono text-muted-foreground leading-relaxed pt-0.5">{step}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 pt-4">
        <div className="text-sm font-semibold px-1">Score Buckets</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {CLASSIFICATIONS.map(({ range, label, note }) => (
            <div key={range} className="flex flex-col sm:flex-row gap-3 p-4 rounded-xl border border-border/50 bg-card/10 transition-colors hover:border-border/80">
              <div className="font-mono text-sm font-bold text-muted-foreground shrink-0 w-16 mt-0.5">
                {range}
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-bold text-foreground">{label}</span>
                <span className="text-xs text-muted-foreground leading-relaxed">{note}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 pt-4">
        <div className="text-sm font-semibold px-1">Layer Weights</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {LAYERS.map(({ label, weight, note, icon: Icon }) => (
            <div key={label} className="p-4 border border-border/50 rounded-xl bg-card/10 flex flex-col gap-3 transition-colors hover:border-border/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">{label}</span>
                </div>
                <span className="font-mono text-xs font-bold text-foreground">{weight}</span>
              </div>
              <span className="text-xs text-muted-foreground leading-relaxed">{note}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 pt-4">
        <div className="text-sm font-semibold px-1">Hard Filters</div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {HARD_FILTERS.map(({ id, rule, result }) => (
            <div key={id} className="p-4 border border-border/50 rounded-xl bg-card/10 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-xs font-bold text-foreground">{id}</span>
                <span className="font-mono text-[10px] text-muted-foreground">{result}</span>
              </div>
              <div className="text-xs text-muted-foreground leading-relaxed">{rule}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 pt-4">
        <div className="text-sm font-semibold px-1">Allocation Engine</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ALLOCATION_RULES.map(({ label, value, note }) => (
            <div key={label} className="grid grid-cols-[140px_90px_1fr] gap-3 p-4 border border-border/50 rounded-xl bg-card/10 text-xs">
              <span className="font-semibold text-foreground">{label}</span>
              <span className="font-mono text-muted-foreground">{value}</span>
              <span className="text-muted-foreground leading-relaxed">{note}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 pt-4">
        <div className="text-sm font-semibold px-1">Rules of Thumb</div>
        <div className="p-5 border border-border/50 rounded-xl bg-card/10 space-y-1">
          {GUARDRAILS.map((note) => (
            <div key={note} className="flex items-start gap-3 p-2 rounded-lg hover:bg-background/50 transition-colors text-xs text-muted-foreground leading-relaxed">
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 shrink-0 mt-1.5" />
              <span className="pt-0.5">{note}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
