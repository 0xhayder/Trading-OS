import { useState } from "react";
import { useSettings } from "@/lib/store";

const CLASSIFICATIONS = [
  { range: "0-44", label: "Reject Trade", note: "No capital deployment" },
  { range: "45-59", label: "Watchlist Only", note: "Monitor until structure or momentum improves" },
  { range: "60-74", label: "Balanced Trade", note: "Base allocation band: 30-40%" },
  { range: "75-84", label: "Aggressive Trade", note: "Base allocation band: 40-55%" },
  { range: "85-100", label: "Asymmetric Swing Trade", note: "Base allocation band: 55-70%" },
];

const LAYERS = [
  { label: "Market", weight: "25%", note: "BTC trend 40%, alt trend 35%, narrative 25%" },
  { label: "Structure", weight: "30%", note: "Setup, support/resistance, retest, HTF alignment, liquidity space" },
  { label: "Momentum", weight: "20%", note: "Volume/market cap, relative volume, candle strength, expansion velocity" },
  { label: "Entry", weight: "15%", note: "RR quality, entry efficiency, distance to resistance, stop-loss efficiency" },
  { label: "Risk", weight: "10%", note: "Volatility, position concentration, correlation exposure reduce sizing" },
];

const GUARDRAILS = [
  "Final score is a weighted 5-layer blend normalized to 0-100.",
  "Higher allocation accepts lower RR: 50% allocation implies minimum RR 2.",
  "Smaller allocation needs stronger asymmetry: 15% allocation implies minimum RR 5.",
  "Sizing is adjusted down for high volatility, weak structure, market headwinds, and RR below the size-implied floor.",
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
    <div className="p-6 space-y-5">
      <h1 className="text-sm font-semibold">Settings</h1>

      <div className="border border-border rounded-sm p-5 space-y-4">
        <div>
          <div className="section-label mb-1.5">Base Account Capital (USD)</div>
          <input
            type="number"
            min="1"
            step="100"
            className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-ring"
            value={capital}
            onChange={(e) => setCapital(e.target.value)}
          />
          <div className="text-xs text-muted-foreground mt-1.5">
            Used by the engine when converting approved allocation bands into position sizing.
          </div>
        </div>

        <button
          className="w-full py-2 text-sm font-mono bg-foreground text-background rounded-sm hover:opacity-90 transition-opacity"
          onClick={handleSave}
        >
          {saved ? "Saved" : "Save"}
        </button>
      </div>

      <div className="border border-border rounded-sm p-5">
        <div className="section-label mb-3">Classification Reference</div>
        <div className="space-y-2">
          {CLASSIFICATIONS.map(({ range, label, note }) => (
            <div key={range} className="grid grid-cols-[64px_180px_1fr] gap-3 text-xs font-mono">
              <span className="text-muted-foreground">{range}</span>
              <span className="text-foreground/80">{label}</span>
              <span className="text-muted-foreground">{note}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border border-border rounded-sm p-5">
        <div className="section-label mb-3">Scoring Layers</div>
        <div className="space-y-2">
          {LAYERS.map(({ label, weight, note }) => (
            <div key={label} className="grid grid-cols-[100px_48px_1fr] gap-3 text-xs font-mono">
              <span className="text-foreground/80">{label}</span>
              <span className="text-muted-foreground">{weight}</span>
              <span className="text-muted-foreground">{note}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border border-border rounded-sm p-5">
        <div className="section-label mb-3">Sizing Guardrails</div>
        <div className="space-y-2">
          {GUARDRAILS.map((note) => (
            <div key={note} className="text-xs font-mono text-muted-foreground">
              {note}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
