/** Shared Recharts axis settings — avoids overlapping dates as series grow. */

export const CHART_MARGIN = { top: 8, right: 8, left: 2, bottom: 28 };

export const CHART_TICK_STYLE = {
  fontSize: 9,
  fill: "hsl(0 0% 35%)",
  fontFamily: "var(--app-font-mono)",
};

export function chartXAxisProps(pointCount: number) {
  const dense = pointCount > 16;
  const medium = pointCount > 8;
  return {
    dataKey: "date" as const,
    tick: CHART_TICK_STYLE,
    axisLine: false,
    tickLine: false,
    minTickGap: 36,
    interval: dense ? Math.max(0, Math.floor(pointCount / 5) - 1) : medium ? 1 : 0,
    angle: dense ? -32 : 0,
    textAnchor: dense ? ("end" as const) : ("middle" as const),
    height: dense ? 52 : 32,
    dy: dense ? 4 : 0,
  };
}

export function chartBarXAxisProps(pointCount: number) {
  const dense = pointCount > 5;
  return {
    dataKey: "name" as const,
    tick: { ...CHART_TICK_STYLE, fontSize: 8 },
    axisLine: false,
    tickLine: false,
    minTickGap: 20,
    interval: dense ? Math.max(0, Math.floor(pointCount / 4) - 1) : 0,
    angle: dense ? -32 : 0,
    textAnchor: dense ? ("end" as const) : ("middle" as const),
    height: dense ? 52 : 28,
  };
}
