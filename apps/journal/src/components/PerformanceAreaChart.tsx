import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { CHART_MARGIN, chartXAxisProps } from "@/lib/chartAxis";

const TT = {
  contentStyle: {
    background: "hsl(0 0% 8%)",
    border: "1px solid hsl(0 0% 14%)",
    borderRadius: "2px",
    fontSize: "11px",
    fontFamily: "var(--app-font-mono)",
  },
  labelStyle: { color: "hsl(0 0% 45%)" },
  itemStyle: { color: "hsl(0 0% 80%)" },
};

type PerformanceAreaChartProps<T extends { date: string }> = {
  data: T[];
  dataKey: keyof T & string;
  height?: number;
  yTickFormatter: (v: number) => string;
  tooltipFormatter: (v: number) => [string, string];
  stroke?: string;
  strokeWidth?: number;
};

export function PerformanceAreaChart<T extends { date: string }>({
  data,
  dataKey,
  height = 160,
  yTickFormatter,
  tooltipFormatter,
  stroke = "hsl(0 0% 70%)",
  strokeWidth = 1.5,
}: PerformanceAreaChartProps<T>) {
  const xProps = chartXAxisProps(data.length);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={CHART_MARGIN}>
        <XAxis {...xProps} />
        <YAxis
          width={48}
          tick={{ fontSize: 9, fill: "hsl(0 0% 35%)", fontFamily: "var(--app-font-mono)" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={yTickFormatter}
        />
        <Tooltip {...TT} formatter={(v: number) => tooltipFormatter(v)} />
        <Area type="monotone" dataKey={String(dataKey)} stroke={stroke} strokeWidth={strokeWidth} fill="transparent" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
