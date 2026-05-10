import { useState } from "react";
import { useSettings } from "@/lib/store";

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
          <div className="section-label mb-1.5">Total Capital (USD)</div>
          <input
            type="number"
            min="1"
            step="100"
            className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-ring"
            value={capital}
            onChange={(e) => setCapital(e.target.value)}
          />
          <div className="text-xs text-muted-foreground mt-1.5">
            Used to calculate position sizes in the scoring output.
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
        <div className="section-label mb-3">Score Reference</div>
        <div className="space-y-2">
          {[
            { range: "0 – 39", label: "Reject", note: "Do not trade" },
            { range: "40 – 54", label: "Watchlist", note: "Monitor, no entry" },
            { range: "55 – 67", label: "Standard Trade", note: "1% allocation" },
            { range: "68 – 81", label: "High Conviction", note: "2.5% allocation" },
            { range: "82 – 100", label: "Expansion Trade", note: "5% allocation" },
          ].map(({ range, label, note }) => (
            <div key={range} className="flex items-center gap-3 text-xs font-mono">
              <span className="text-muted-foreground w-14 shrink-0">{range}</span>
              <span className="text-foreground/80 w-32 shrink-0">{label}</span>
              <span className="text-muted-foreground">{note}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
