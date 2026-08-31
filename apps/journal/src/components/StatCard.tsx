export function StatCard({
  label,
  value,
  color,
  size = "sm",
}: {
  label: string;
  value: string;
  color?: string;
  size?: "sm" | "md";
}) {
  const md = size === "md";
  return (
    <div
      className={`border border-border rounded-sm min-w-0 flex flex-col justify-center ${
        md ? "px-3.5 py-3.5 min-h-[72px]" : "px-2 py-1.5"
      }`}
    >
      <div
        className={`font-semibold uppercase tracking-wider text-muted-foreground truncate ${
          md ? "text-[11px] mb-1.5" : "text-[10px] mb-0.5"
        }`}
      >
        {label}
      </div>
      <div
        className={`font-mono font-semibold leading-tight whitespace-nowrap truncate ${
          md ? "text-lg" : "text-sm"
        } ${color ?? "text-foreground"}`}
      >
        {value}
      </div>
    </div>
  );
}
