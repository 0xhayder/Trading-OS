import { useState } from "react";
import { useSettings } from "@/lib/store";
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
  Crosshair
} from "lucide-react";

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
  "Capital field here is only for turning percent bands into dollar hints — it does not change engine math.",
];

export default function Settings() {
  const { settings, updateSettings } = useSettings();
  const [capital, setCapital] = useState(String(settings.totalCapital));
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const val = parseFloat(capital);
    if (!isNaN(val) && val > 0) {
      updateSettings({ totalCapital: val });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <div className="p-6 space-y-8 pb-12">
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <div className="p-2 bg-muted rounded-md">
          <SettingsIcon className="w-5 h-5 text-foreground" />
        </div>
        <div>
          <h1 className="text-base font-semibold">Settings & Reference</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Configure capital and review engine logic</p>
        </div>
      </div>

      <div className="border border-border/60 rounded-xl bg-card/20 p-6 space-y-6 shadow-sm relative overflow-hidden">
        {/* Subtle accent line */}
        <div className="absolute top-0 left-0 w-1 h-full bg-foreground/20"></div>
        
        <div className="pl-2">
          <div className="text-sm font-semibold mb-3 flex items-center gap-2">
            Base Account Capital
          </div>
          <div className="relative max-w-2xl">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
            </div>
            <input
              type="number"
              min="1"
              step="100"
              className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-shadow shadow-sm"
              value={capital}
              onChange={(e) => setCapital(e.target.value)}
            />
          </div>
          <div className="text-xs text-muted-foreground mt-3 leading-relaxed flex items-start gap-2 max-w-2xl">
            <Info className="w-4 h-4 shrink-0 mt-0.5 opacity-70" />
            <span>Used to turn engine percent bands into dollar ranges on the decision screen and journal. It does not change how the engine scores the setup.</span>
          </div>
        </div>

        <div className="pl-2">
          <button
            type="button"
            className="w-full max-w-2xl py-2.5 text-sm font-mono font-medium bg-foreground text-background rounded-lg hover:bg-foreground/90 transition-all active:scale-[0.98] shadow-sm flex items-center justify-center gap-2"
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
