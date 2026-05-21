import { useEffect, useMemo, useState } from "react";
import { computeAccountEquitySnapshot } from "@/lib/portfolioMetrics";
import { useCapitalAdjustments, useSettings, useTrades } from "@/lib/store";
import { 
  DollarSign, 
  Info, 
  ListOrdered, 
  Activity, 
  ShieldAlert, 
  PieChart, 
  CheckCircle2,
  AlertTriangle,
  Eye,
  XCircle,
  Ban,
  Settings as SettingsIcon,
  Crosshair,
  Trash2
} from "lucide-react";
import CapitalSummary from "@/components/CapitalSummary";

const CLASSIFICATIONS = [
  { range: "0–44", label: "Reject Trade", note: "Score band only — engine may still label HARD REJECT on veto rules." },
  { range: "45–59", label: "Watchlist Only", note: "Not a deploy yet. Save to watchlist, wait for better tape or levels." },
  { range: "60–74", label: "Standard Trade", note: "Typical size band about 10–18% of equity (non‑linear curve)." },
  { range: "75–87", label: "High Conviction Trade", note: "Typical size band about 20–35%." },
  { range: "88–100", label: "Expansion Trade", note: "Typical size band about 35–60%. Needs S1 synergy + strong structure/momentum gates." },
];

const PIPELINE_STEPS = [
  "Hard filters (vetoes before any pretty score)",
  "Base layer scores (structure, market, momentum, entry, risk with fixed weights)",
  "Conditional rules (shift weights or trim layers)",
  "Positive synergies (clusters that help)",
  "Negative synergies (clusters that hurt size or score)",
  "Risk compression (uncertainty band, tape disagreement, weak risk layer)",
  "Classification (maps score + rules into trade bucket)",
  "Nonlinear allocation (size curve, structure cap vs momentum)",
  "RR / SL guidance (wider vs tighter invalidation)",
];

const LAYERS = [
  { label: "Structure", weight: "35%", note: "Retest 40%, level clarity 35%, HTF 25%. Setup type still used inside hard filters.", icon: PieChart },
  { label: "Market", weight: "25%", note: "BTC 45%, alts 35%, narrative 20%.", icon: Activity },
  { label: "Momentum", weight: "20%", note: "Volume 40%, candle 35%, follow‑through 25%.", icon: Activity },
  { label: "Entry", weight: "15%", note: "Entry distance 35%, room to resistance 40%, RR quality 25%.", icon: Crosshair },
  { label: "Risk", weight: "5%", note: "Overextension 45%, event risk 35%, liquidity risk 20%.", icon: ShieldAlert },
];

const DECISION_SCREEN = [
  {
    state: "EXECUTE",
    note: "Full green path: log at suggested size (you still set final USD)."
  },
  {
    state: "EXECUTE CAUTIOUSLY",
    note: "Approved but tape or risk is messy — log smaller on purpose."
  },
  {
    state: "WATCHLIST",
    note: "Idea only — save to watchlist, no normal trade log button."
  },
  {
    state: "BLOCKED",
    note: "Score can look okay, but regime or rules say no normal entry. Muted “log anyway” if you insist on journaling."
  },
  {
    state: "HARD REJECT",
    note: "Broken setup or hard veto — only dismiss. No trade log."
  },
];

const GUARDRAILS = [
  "The big headline on the score screen always beats a high number. Read the headline first.",
  "Final score is not a simple average of the five layer bars. It is the post‑filter execution score.",
  "Allocation uses a curve, not a straight line from score to percent.",
  "Higher planned size asks for a lower minimum RR; tiny size asks for a higher RR floor.",
  "Net capital (top right) is used for percent-to-dollar sizing hints — it does not change engine score math.",
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
            <p className="text-xs text-muted-foreground mt-0.5">Configure capital and review engine logic</p>
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
              Base equity drives account return and sizing hints. Deposits and withdrawals update net capital (top right).
              Trading P&L is tracked separately and also flows into net capital when trades close.
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
                {equity.tradingPnlUsd >= 0 ? "+" : "−"}${Math.abs(equity.tradingPnlUsd).toLocaleString()}
              </div>
            </div>
            <div className="border border-border rounded-sm px-2.5 py-2">
              <div className="text-[10px] uppercase text-muted-foreground mb-0.5">Deposits</div>
              <div className="text-green-400/90">+${equity.depositsUsd.toLocaleString()}</div>
            </div>
            <div className="border border-border rounded-sm px-2.5 py-2">
              <div className="text-[10px] uppercase text-muted-foreground mb-0.5">Withdrawals</div>
              <div className="text-red-400/90">−${equity.withdrawalsUsd.toLocaleString()}</div>
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
            {saved ? "Saved ✓" : "Save Configuration"}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="text-sm font-semibold px-1">Decision Screen States</div>
        <p className="text-xs text-muted-foreground px-1 leading-relaxed max-w-2xl">
          The journal shows a decision terminal. The top banner is the real call. The numbers below explain how we got there.
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
        <div className="text-sm font-semibold px-1 flex items-center gap-2">
          Engine Pipeline
        </div>
        <div className="p-5 border border-border/50 rounded-xl bg-card/10 space-y-1">
          {PIPELINE_STEPS.map((s, idx) => (
            <div key={s} className="flex items-start gap-3 p-2 rounded-lg hover:bg-background/50 transition-colors">
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-muted/60 text-[10px] font-mono font-medium text-foreground/70 shrink-0 mt-0.5 border border-border/50">
                {idx + 1}
              </div>
              <span className="text-xs font-mono text-muted-foreground leading-relaxed pt-0.5">{s}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 pt-4">
        <div className="text-sm font-semibold px-1">Score Buckets Reference</div>
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
        <div className="text-sm font-semibold px-1">Layer Weights Blend</div>
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
        <div className="text-sm font-semibold px-1">Rules of Thumb</div>
        <div className="p-5 border border-border/50 rounded-xl bg-card/10 space-y-1">
          {GUARDRAILS.map((note, idx) => (
            <div key={idx} className="flex items-start gap-3 p-2 rounded-lg hover:bg-background/50 transition-colors text-xs text-muted-foreground leading-relaxed">
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 shrink-0 mt-1.5" />
              <span className="pt-0.5">{note}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
