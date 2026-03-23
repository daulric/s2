"use client"

import { cn } from "@/lib/utils"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

const COLORS = {
  bullish: "#22c55e",
  neutral: "#eab308",
  bearish: "#ef4444",
  unscored: "#71717a",
} as const

type Slice = {
  name: string
  value: number
  key: keyof typeof COLORS
}

type StockArticleSentimentSummaryProps = {
  bullish: number
  neutral: number
  bearish: number
  unscored: number
  className?: string
}

export function StockArticleSentimentSummary({
  bullish,
  neutral,
  bearish,
  unscored,
  className,
}: StockArticleSentimentSummaryProps) {
  const total = bullish + neutral + bearish + unscored
  if (total === 0) return null

  const fullSeries: Slice[] = [
    { name: "Bullish", value: bullish, key: "bullish" },
    { name: "Neutral", value: neutral, key: "neutral" },
    { name: "Bearish", value: bearish, key: "bearish" },
    { name: "Unscored", value: unscored, key: "unscored" },
  ]

  const pieData = fullSeries.filter((d) => d.value > 0)

  const pieTooltip = (props: { active?: boolean; payload?: readonly { payload?: unknown }[] }) => {
    if (!props.active || !props.payload?.length) return null
    const p = props.payload[0]!.payload as Slice
    const pct = ((p.value / total) * 100).toFixed(0)
    return (
      <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md">
        <p className="font-medium">{p.name}</p>
        <p className="text-muted-foreground">
          {p.value} article{p.value === 1 ? "" : "s"} ({pct}%)
        </p>
      </div>
    )
  }

  const barTooltip = (props: { active?: boolean; payload?: readonly { payload?: unknown }[] }) => {
    if (!props.active || !props.payload?.length) return null
    const p = props.payload[0]!.payload as Slice
    const pct = ((p.value / total) * 100).toFixed(0)
    return (
      <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md">
        <p className="font-medium">{p.name}</p>
        <p className="text-muted-foreground">
          {p.value} article{p.value === 1 ? "" : "s"} ({pct}%)
        </p>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-2 lg:items-end lg:gap-6",
        className,
      )}
    >
      <div className="min-h-[220px] w-full min-w-0">
        <p className="mb-2 text-center text-xs font-medium text-muted-foreground">Share of articles</p>
        <div className="h-[200px] w-full min-w-0">
          <ResponsiveContainer width="100%" height={200} minWidth={0} minHeight={0} debounce={32}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={44}
                outerRadius={72}
                paddingAngle={pieData.length > 1 ? 2 : 0}
              >
                {pieData.map((entry) => (
                  <Cell key={entry.key} fill={COLORS[entry.key]} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip content={pieTooltip} />
              <Legend
                verticalAlign="bottom"
                height={28}
                formatter={(value) => <span className="text-xs text-foreground">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="min-h-[220px] w-full min-w-0">
        <p className="mb-2 text-center text-xs font-medium text-muted-foreground">Count by label</p>
        <div className="h-[200px] w-full min-w-0">
          <ResponsiveContainer width="100%" height={200} minWidth={0} minHeight={0} debounce={32}>
            <BarChart data={fullSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="currentColor"
                className="text-border"
                opacity={0.35}
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                stroke="currentColor"
                className="text-muted-foreground"
                interval={0}
              />
              <YAxis
                allowDecimals={false}
                width={36}
                tick={{ fontSize: 11 }}
                stroke="currentColor"
                className="text-muted-foreground"
              />
              <Tooltip content={barTooltip} cursor={{ fill: "hsl(var(--muted) / 0.35)" }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48}>
                {fullSeries.map((entry) => (
                  <Cell key={entry.key} fill={COLORS[entry.key]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
