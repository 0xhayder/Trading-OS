/** Clean display for ISO timestamps from the journal / API. */

function parseMs(iso: string | undefined | null): number | null {
  if (iso == null || String(iso).trim() === "") return null;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : null;
}

/** One line: "May 11, 2026 · 3:45 PM" */
export function formatTradeDateTime(iso: string | undefined | null): string {
  const ms = parseMs(iso);
  if (ms == null) return "—";
  const d = new Date(ms);
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${date} · ${time}`;
}

/** Compact for tables: "May 11" + small year if not current year */
export function formatTradeDateShort(iso: string | undefined | null): string {
  const ms = parseMs(iso);
  if (ms == null) return "—";
  const d = new Date(ms);
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  if (sameYear) {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Second line under short: time only */
export function formatTradeTimeOnly(iso: string | undefined | null): string {
  const ms = parseMs(iso);
  if (ms == null) return "";
  return new Date(ms).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
