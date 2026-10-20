import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { compactMoney, formatCell, headerOf } from "@/lib/format";
import type { AskResponse } from "@/lib/types";

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

export function ResultChart({ data }: { data: AskResponse }) {
  const chart = data.chart!;
  const xi = data.columns.findIndex((c) => c.name === chart.x);
  const ys = chart.y.map((y) => data.columns.findIndex((c) => c.name === y)).filter((i) => i >= 0);
  if (xi < 0 || ys.length === 0) return null;
  const xCol = data.columns[xi]!;
  const yType = data.columns[ys[0]!]!.type;
  const points = data.rows.slice(0, 200).map((r) => {
    const o: Record<string, string | number | null> = {
      x: formatCell(r[xi] ?? null, xCol.type) ?? "—",
    };
    ys.forEach((i) => (o[data.columns[i]!.name] = typeof r[i] === "number" ? r[i] : Number(r[i])));
    return o;
  });
  const tick = { fill: "currentColor", fontSize: 12 };
  const common = { data: points, margin: { top: 8, right: 8, left: 0, bottom: 0 } };
  return (
    <div className="h-72 w-full text-muted-foreground">
      <ResponsiveContainer>
        {chart.type === "line" ? (
          <LineChart {...common}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="x"
              tick={tick}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={12}
            />
            <YAxis
              tick={tick}
              tickLine={false}
              axisLine={false}
              width={56}
              tickFormatter={(v) => (yType === "money" ? compactMoney(v) : compactMoney(v))}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)" }}
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                color: "var(--popover-foreground)",
              }}
              formatter={(v: number, name: string) => {
                const c = data.columns.find((c) => c.name === name)!;
                return [formatCell(v, c.type), headerOf(c)];
              }}
            />
            {ys.map((i, k) => (
              <Line
                key={i}
                type="monotone"
                dataKey={data.columns[i]!.name}
                stroke={COLORS[k % 4]}
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
            ))}
          </LineChart>
        ) : (
          <BarChart {...common}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="x"
              tick={tick}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={12}
            />
            <YAxis
              tick={tick}
              tickLine={false}
              axisLine={false}
              width={56}
              tickFormatter={(v) => (yType === "money" ? compactMoney(v) : compactMoney(v))}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)" }}
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                color: "var(--popover-foreground)",
              }}
              formatter={(v: number, name: string) => {
                const c = data.columns.find((c) => c.name === name)!;
                return [formatCell(v, c.type), headerOf(c)];
              }}
            />
            {ys.map((i, k) => (
              <Bar
                key={i}
                dataKey={data.columns[i]!.name}
                fill={COLORS[k % 4]}
                radius={[6, 6, 0, 0]}
              />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
