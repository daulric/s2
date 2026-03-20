"use client"

import { useCallback, useEffect, useRef } from "react"
import { useSignals, useSignal } from "@preact/signals-react/runtime"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  ReferenceLine,
} from "recharts"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, BarChart3, Radio } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PriceCandle } from "@/lib/stocks/types"
import type { CandleRange } from "@/lib/stocks/api"
import { GetStockCandles } from "@/serverActions/GetStockDetails"
import { useStockFeed, type TradeUpdate } from "@/hooks/use-stock-feed"

type StockChartProps = {
  ticker: string
  initialCandles: PriceCandle[]
  priceChangePct: number | null
}

/** Keep in sync with `GetStockDetail` initial candle range. */
const DEFAULT_CHART_RANGE: CandleRange = "3M"

const RANGES: { label: string; value: CandleRange }[] = [
  { label: "1D", value: "1D" },
  { label: "1W", value: "1W" },
  { label: "1M", value: "1M" },
  { label: "3M", value: "3M" },
  { label: "1Y", value: "1Y" },
  { label: "5Y", value: "5Y" },
  { label: "10Y", value: "10Y" },
  { label: "All", value: "ALL" },
]

function formatDate(dateStr: string, range: CandleRange): string {
  const d = new Date(dateStr)
  if (range === "1D") {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  }
  if (range === "1W") {
    return d.toLocaleDateString("en-US", { weekday: "short", hour: "numeric" })
  }
  if (range === "1M" || range === "3M") {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }
  if (range === "1Y") {
    return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
  }
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" })
}

function formatAxisPrice(value: number): string {
  return `$${value.toFixed(0)}`
}

function formatVolume(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`
  return value.toString()
}

function CustomTooltip({ active, payload, label, range }: {
  active?: boolean
  payload?: { value: number; dataKey: string }[]
  label?: string
  range: CandleRange
}) {
  if (!active || !payload?.length || !label) return null

  const close = payload.find((p) => p.dataKey === "close")
  const volume = payload.find((p) => p.dataKey === "volume")

  return (
    <div className="rounded-lg border bg-popover p-2.5 shadow-md text-sm">
      <p className="text-xs text-muted-foreground mb-1">{formatDate(label, range)}</p>
      {close && (
        <p className="font-semibold">
          ${close.value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      )}
      {volume && (
        <p className="text-xs text-muted-foreground mt-0.5">
          Vol: {formatVolume(volume.value)}
        </p>
      )}
    </div>
  )
}

export function StockChart({ ticker, initialCandles, priceChangePct }: StockChartProps) {
  useSignals()

  const activeRange = useSignal<CandleRange>(DEFAULT_CHART_RANGE)
  const candles = useSignal<PriceCandle[]>(initialCandles)
  const loading = useSignal(false)
  const showVolume = useSignal(true)
  const livePrice = useSignal<number | null>(null)
  const isLive = useSignal(false)

  const throttleRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)
  const candleFetchSeq = useRef(0)

  const latestTrade = useStockFeed(ticker, useCallback((update: TradeUpdate) => {
    if (!mountedRef.current) return
    livePrice.value = update.price
    isLive.value = true

    if (throttleRef.current) return
    throttleRef.current = setTimeout(() => {
      throttleRef.current = null
      if (!mountedRef.current) return

      const current = candles.value
      if (current.length === 0) return

      const lastCandle = current[current.length - 1]
      const lastTime = new Date(lastCandle.date).getTime()
      const now = Date.now()

      const intervalMs = activeRange.value === "1D" ? 5 * 60 * 1000
        : activeRange.value === "1W" ? 30 * 60 * 1000
        : 60 * 60 * 1000

      if (now - lastTime < intervalMs) {
        const updated = [...current]
        updated[updated.length - 1] = {
          ...lastCandle,
          close: update.price,
          high: Math.max(lastCandle.high, update.price),
          low: Math.min(lastCandle.low, update.price),
          volume: lastCandle.volume + update.volume,
        }
        candles.value = updated
      } else {
        candles.value = [...current, {
          date: new Date(now).toISOString(),
          open: update.price,
          high: update.price,
          low: update.price,
          close: update.price,
          volume: update.volume,
        }]
      }
    }, 1000)
  }, [candles, activeRange, livePrice, isLive]))

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (throttleRef.current) {
        clearTimeout(throttleRef.current)
        throttleRef.current = null
      }
    }
  }, [])

  /** If the server returned no candles (e.g. AV throttled), load the default range on mount. */
  useEffect(() => {
    if (initialCandles.length > 0) return

    let cancelled = false
    loading.value = true
    GetStockCandles(ticker, DEFAULT_CHART_RANGE)
      .then((data) => {
        if (!cancelled) candles.value = data
      })
      .catch(() => {
        /* keep [] */
      })
      .finally(() => {
        if (!cancelled) loading.value = false
      })

    return () => {
      cancelled = true
    }
  }, [ticker, initialCandles.length])

  const handleRangeChange = useCallback(async (range: CandleRange) => {
    if (range === activeRange.value) return
    activeRange.value = range
    const seq = ++candleFetchSeq.current
    loading.value = true
    try {
      const data = await GetStockCandles(ticker, range)
      if (seq !== candleFetchSeq.current || !mountedRef.current) return
      candles.value = data
    } catch {
      if (seq !== candleFetchSeq.current || !mountedRef.current) return
      candles.value = []
    } finally {
      if (seq === candleFetchSeq.current && mountedRef.current) {
        loading.value = false
      }
    }
  }, [ticker])

  const chartData = candles.value.map((c) => ({
    date: c.date,
    close: c.close,
    high: c.high,
    low: c.low,
    open: c.open,
    volume: c.volume,
  }))

  const prices = chartData.map((d) => d.close)
  const minPrice = prices.length ? Math.min(...prices) * 0.998 : 0
  const maxPrice = prices.length ? Math.max(...prices) * 1.002 : 100
  const openPrice = prices.length ? prices[0] : 0

  const currentPrice = livePrice.value ?? (prices.length ? prices[prices.length - 1] : 0)
  const priceChange = currentPrice - openPrice
  const priceChangePctCalc = openPrice !== 0 ? (priceChange / openPrice) * 100 : 0
  const dynamicIsPositive = priceChange >= 0
  const dynamicColor = dynamicIsPositive ? "#10b981" : "#ef4444"
  const gradientId = `gradient-${ticker}`

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Price Chart
            </h2>
            {isLive.value && (
              <span className="flex items-center gap-1 text-xs text-emerald-500">
                <Radio className="h-3 w-3 animate-pulse" />
                Live
              </span>
            )}
            {(chartData.length >= 2 || livePrice.value !== null) && (
              <span className={cn("text-sm font-medium", dynamicIsPositive ? "text-emerald-500" : "text-red-500")}>
                {livePrice.value !== null && (
                  <span className="mr-1.5 font-bold">
                    ${livePrice.value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                )}
                {dynamicIsPositive ? "+" : ""}
                {priceChange.toFixed(2)} ({dynamicIsPositive ? "+" : ""}{priceChangePctCalc.toFixed(2)}%)
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-7 px-2 text-xs", showVolume.value && "bg-muted")}
              onClick={() => { showVolume.value = !showVolume.value }}
            >
              Vol
            </Button>
            {RANGES.map((r) => (
              <Button
                key={r.value}
                variant={activeRange.value === r.value ? "default" : "ghost"}
                size="sm"
                className="h-7 px-2.5 text-xs"
                onClick={() => handleRangeChange(r.value)}
                disabled={loading.value}
              >
                {r.label}
              </Button>
            ))}
          </div>
        </div>

        {loading.value ? (
          <div className="flex items-center justify-center h-[300px]">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
            No price data available.
          </div>
        ) : (
          <div className="w-full min-w-0 min-h-[300px]">
            <ResponsiveContainer width="100%" height={300} minWidth={0}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={dynamicColor} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={dynamicColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="currentColor"
                  className="text-border"
                  opacity={0.3}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => formatDate(v, activeRange.value)}
                  stroke="currentColor"
                  className="text-muted-foreground"
                  interval="preserveStartEnd"
                  minTickGap={50}
                />
                <YAxis
                  domain={[minPrice, maxPrice]}
                  tick={{ fontSize: 11 }}
                  tickFormatter={formatAxisPrice}
                  stroke="currentColor"
                  className="text-muted-foreground"
                  width={60}
                />
                <Tooltip content={<CustomTooltip range={activeRange.value} />} />
                {openPrice > 0 && (
                  <ReferenceLine
                    y={openPrice}
                    stroke="currentColor"
                    className="text-muted-foreground"
                    strokeDasharray="4 4"
                    opacity={0.4}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="close"
                  stroke={dynamicColor}
                  strokeWidth={2}
                  fill={`url(#${gradientId})`}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0, fill: dynamicColor }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>

            {showVolume.value && (
              <div className="mt-2 w-full min-w-0">
                <ResponsiveContainer width="100%" height={80} minWidth={0}>
                <BarChart data={chartData} margin={{ top: 0, right: 5, left: 0, bottom: 0 }}>
                  <XAxis dataKey="date" hide />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip range={activeRange.value} />} />
                  <Bar
                    dataKey="volume"
                    fill={dynamicColor}
                    opacity={0.3}
                    radius={[2, 2, 0, 0]}
                    isAnimationActive={false}
                  />
                </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
