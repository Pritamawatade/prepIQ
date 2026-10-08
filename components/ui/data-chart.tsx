"use client";

import { BarChart3, PieChart as PieChartIcon, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DataPoint {
  name: string;
  value: number;
  percentage?: number;
}

interface DataChartProps {
  data: DataPoint[];
  title?: string;
  type?: "pie" | "bar";
}

const COLORS = ["#3158a5", "#5479bb", "#3d7a78", "#a16a3f", "#78639c", "#587b9b", "#9a5262", "#75813b"];

function polarPoint(cx: number, cy: number, radius: number, angle: number) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) };
}

function slicePath(cx: number, cy: number, radius: number, start: number, end: number) {
  const from = polarPoint(cx, cy, radius, end);
  const to = polarPoint(cx, cy, radius, start);
  const largeArc = end - start > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${from.x} ${from.y} A ${radius} ${radius} 0 ${largeArc} 0 ${to.x} ${to.y} Z`;
}

function PieGraphic({ data }: { data: DataPoint[] }) {
  const drawable = data.filter((item) => item.value > 0);
  const positiveTotal = drawable.reduce((sum, item) => sum + item.value, 0);
  if (drawable.length === 0 || positiveTotal <= 0) {
    return <p className="py-16 text-center text-sm text-muted-foreground">There are no positive values to chart.</p>;
  }

  let angle = 0;
  const slices = drawable.map((item, index) => {
    const start = angle;
    const sweep = (item.value / positiveTotal) * 360;
    angle += sweep;
    return { item, start, end: angle, color: COLORS[index % COLORS.length] };
  });

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center sm:gap-10">
      <svg className="size-52 max-w-full" viewBox="0 0 200 200" role="img" aria-label="Pie chart of values by category">
        <title>Values by category</title>
        {slices.map(({ item, start, end, color }) => end - start >= 359.99 ? (
          <circle key={item.name} cx="100" cy="100" r="88" fill={color}>
            <title>{`${item.name}: ${item.value.toLocaleString()} (100%)`}</title>
          </circle>
        ) : (
          <path key={item.name} d={slicePath(100, 100, 88, start, end)} fill={color} stroke="var(--card)" strokeWidth="2">
            <title>{`${item.name}: ${item.value.toLocaleString()} (${((item.value / positiveTotal) * 100).toFixed(1)}%)`}</title>
          </path>
        ))}
      </svg>
      <ul className="grid w-full gap-x-5 gap-y-2 sm:w-auto">
        {slices.map(({ item, color }) => <li key={item.name} className="flex min-w-0 items-center gap-2 text-sm">
          <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
          <span className="max-w-44 truncate">{item.name}</span>
          <span className="ml-auto pl-2 font-medium tabular-nums">{((item.value / positiveTotal) * 100).toFixed(1)}%</span>
        </li>)}
      </ul>
    </div>
  );
}

function BarGraphic({ data }: { data: DataPoint[] }) {
  const width = 680;
  const left = 190;
  const right = 58;
  const rowHeight = 42;
  const height = Math.max(180, data.length * rowHeight + 24);
  const values = data.map((item) => item.value);
  const max = Math.max(0, ...values);
  const min = Math.min(0, ...values);
  const span = max - min || 1;
  const plotWidth = width - left - right;
  const zeroX = left + ((0 - min) / span) * plotWidth;

  return (
    <div className="w-full overflow-x-auto">
      <svg className="h-auto min-w-[520px] w-full" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Horizontal bar chart of values by category">
        <title>Values by category</title>
        <line x1={zeroX} x2={zeroX} y1="8" y2={height - 8} stroke="currentColor" strokeOpacity=".2" />
        {data.map((item, index) => {
          const y = 12 + index * rowHeight;
          const valueX = left + ((item.value - min) / span) * plotWidth;
          const x = Math.min(zeroX, valueX);
          const barWidth = Math.max(1, Math.abs(valueX - zeroX));
          return <g key={`${item.name}-${index}`}>
            <text x={left - 12} y={y + 19} textAnchor="end" fill="currentColor" fontSize="12">{item.name.length > 23 ? `${item.name.slice(0, 22)}…` : item.name}<title>{item.name}</title></text>
            <rect x={x} y={y + 3} width={barWidth} height="20" rx="5" fill={COLORS[index % COLORS.length]} />
            <text x={Math.min(width - 4, Math.max(left + 8, valueX + (item.value >= 0 ? 8 : -8)))} y={y + 18} textAnchor={item.value >= 0 ? "start" : "end"} fill="currentColor" fontSize="11" fontWeight="600">{item.value.toLocaleString()}</text>
          </g>;
        })}
      </svg>
    </div>
  );
}

export function DataChart({ data, title, type = "pie" }: DataChartProps) {
  if (!data?.length) return null;

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const Icon = type === "pie" ? PieChartIcon : BarChart3;

  return (
    <Card className="my-4 border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="size-4 text-primary" />
          {title || "Data visualization"}
          <Badge variant="secondary" className="ml-auto text-xs"><TrendingUp className="mr-1 size-3" />{data.length} items</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {type === "pie" ? <PieGraphic data={data} /> : <BarGraphic data={data} />}
        <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-muted/60 p-3 text-xs sm:text-sm">
          <div><span className="text-muted-foreground">Total value</span><p className="mt-1 font-semibold tabular-nums">{total.toLocaleString()}</p></div>
          <div><span className="text-muted-foreground">Categories</span><p className="mt-1 font-semibold">{data.length}</p></div>
        </div>
      </CardContent>
    </Card>
  );
}
