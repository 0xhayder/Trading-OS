import { useState } from "react";
import { useSettings } from "@/lib/store";

function Field({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-border last:border-b-0">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      </div>
      <div className="w-40">{children}</div>
    </div>
  );
}

export default function Settings() {
  const { settings, updateSettings } = useSettings();
  const [form, setForm] = useState(settings);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    updateSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const inp = (key: keyof typeof form) => (
    <input
      type="number"
      step="any"
      className="w-full bg-background border border-border rounded-sm px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-ring font-mono text-right"
      value={form[key]}
      onChange={(e) => setForm((p) => ({ ...p, [key]: parseFloat(e.target.value) || 0 }))}
      data-testid={`input-settings-${key}`}
    />
  );

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-base font-semibold tracking-tight">Settings</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Account configuration and risk parameters</p>
      </div>

      <div className="border border-border bg-card rounded-sm px-5">
        <div className="section-label pt-4 pb-3 border-b border-border">Account</div>
        <Field label="Total Capital" sub="Your total trading account size in USD">
          {inp("totalCapital")}
        </Field>
      </div>

      <div className="border border-border bg-card rounded-sm px-5">
        <div className="section-label pt-4 pb-3 border-b border-border">Risk Profile</div>
        <Field label="Risk Profile %" sub="Base portfolio risk per trade">
          {inp("riskProfilePct")}
        </Field>
        <Field label="Default Risk %" sub="Default per-trade risk percentage">
          {inp("defaultRiskPct")}
        </Field>
        <Field label="Max Allocation %" sub="Maximum position size (Expansion trades)">
          {inp("maxAllocationPct")}
        </Field>
      </div>

      <div className="border border-border bg-card rounded-sm px-5 py-4">
        <div className="section-label mb-4">Scoring System — Reference</div>
        <div className="space-y-2 text-xs font-mono text-muted-foreground">
          {[
            ["0–39", "Reject", "Do not trade"],
            ["40–54", "Watchlist", "Monitor only, no entry"],
            ["55–67", "Standard Trade", "1% allocation"],
            ["68–81", "High Conviction", "2.5% allocation"],
            ["82–100", "Expansion Trade", "5% allocation"],
          ].map(([range, status, action]) => (
            <div key={range} className="flex items-center gap-4">
              <span className="w-14 shrink-0">{range}</span>
              <span className="w-32 shrink-0 text-foreground/70">{status}</span>
              <span>{action}</span>
            </div>
          ))}
        </div>
      </div>

      <button
        className="px-5 py-2 text-sm font-mono bg-foreground text-background rounded-sm hover:opacity-90 transition-opacity"
        onClick={handleSave}
        data-testid="button-save-settings"
      >
        {saved ? "Saved" : "Save Settings"}
      </button>
    </div>
  );
}
