import { useCapitalAdjustments, useSettings, useTrades } from "@/lib/store";
import { totalCapitalAdjustmentsUsd, totalRealizedUsd } from "@/lib/portfolioMetrics";

function formatUsd(value: number): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CapitalSummary() {
  const { settings } = useSettings();
  const { trades } = useTrades();
  const { adjustments } = useCapitalAdjustments();

  const closed = trades.filter((t) => t.outcome && t.actualPnlPct != null);
  const tradingPnlUsd = totalRealizedUsd(closed);
  const adjustmentsNetUsd = totalCapitalAdjustmentsUsd(adjustments);
  const totalCapital = settings.totalCapital + tradingPnlUsd + adjustmentsNetUsd;

  return (
    <div className="text-right font-mono shrink-0">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground leading-none">
        Capital:{" "}
        <span className="text-foreground tabular-nums text-xs font-semibold">
          ${formatUsd(totalCapital)}
        </span>
      </div>
    </div>
  );
}
