export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function roundTo(n: number, decimals: number): number {
  const p = 10 ** decimals;
  return Math.round(n * p) / p;
}

/** Map [-1,1] blend to [0,100] institutional dashboard scale */
export function normalizeBlendTo100(blend: number): number {
  const n = ((blend + 1) / 2) * 100;
  return roundTo(clamp(n, 0, 100), 2);
}

/**
 * Minimum RR guardrail as a function of intended allocation %.
 * Higher conviction sizing requires lower minimum RR; smaller size requires higher RR.
 * Anchors: 15% → RR 5, 50% → RR 2 (linear between).
 */
export function minRrForAllocation(allocationPct: number): number {
  const a = clamp(allocationPct, 15, 50);
  const rr = 5 - ((a - 15) / (50 - 15)) * (5 - 2);
  return roundTo(rr, 2);
}
