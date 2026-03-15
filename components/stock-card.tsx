"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Minus, Newspaper } from "lucide-react"
import { cn } from "@/lib/utils"
import { StockSparkline } from "@/components/stock-sparkline"
import type { StockWithPrediction } from "@/lib/stocks/types"

type StockCardProps = {
  stock: StockWithPrediction
  compact?: boolean
}

function formatPrice(price: number | null): string {
  if (price === null) return "—"
  return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatChangePct(pct: number | null): string {
  if (pct === null) return "—"
  const sign = pct >= 0 ? "+" : ""
  return `${sign}${pct.toFixed(2)}%`
}

function formatScore(score: number): string {
  return (score * 100).toFixed(0)
}

const directionConfig = {
  bullish: {
    icon: TrendingUp,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    label: "Bullish",
  },
  bearish: {
    icon: TrendingDown,
    color: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    label: "Bearish",
  },
  neutral: {
    icon: Minus,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
    label: "Neutral",
  },
}

export function StockCard({ stock, compact = false }: StockCardProps) {
  const prediction = stock.prediction
  const direction = prediction?.direction ?? "neutral"
  const config = directionConfig[direction]
  const DirectionIcon = config.icon

  if (compact) {
    return (
      <Link href={`/stocks/${stock.ticker}`}>
        <Card className="overflow-hidden hover:border-primary/20 transition-colors">
          <CardContent className="p-3 flex items-center gap-3">
            <div className={cn("w-8 h-8 rounded-md flex items-center justify-center shrink-0", config.bg)}>
              <DirectionIcon className={cn("h-4 w-4", config.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{stock.ticker}</span>
                <span className="text-xs text-muted-foreground truncate">{stock.name}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs">{formatPrice(stock.last_price)}</span>
                <span className={cn("text-xs", stock.price_change_pct && stock.price_change_pct >= 0 ? "text-emerald-500" : "text-red-500")}>
                  {formatChangePct(stock.price_change_pct)}
                </span>
              </div>
            </div>
            <div className="shrink-0">
              <StockSparkline
                ticker={stock.ticker}
                width={64}
                height={24}
                positive={(stock.price_change_pct ?? 0) >= 0}
              />
            </div>
            {prediction && (
              <div className="text-right shrink-0">
                <Badge variant="outline" className={cn("text-xs", config.color, config.border)}>
                  {formatScore(prediction.score)}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </Link>
    )
  }

  return (
    <Link href={`/stocks/${stock.ticker}`}>
      <Card className="overflow-hidden hover:border-primary/20 transition-colors h-full">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-semibold text-lg">{stock.ticker}</h3>
              <p className="text-xs text-muted-foreground line-clamp-1">{stock.name}</p>
            </div>
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", config.bg)}>
              <DirectionIcon className={cn("h-5 w-5", config.color)} />
            </div>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-xl font-bold">{formatPrice(stock.last_price)}</span>
            <span className={cn(
              "text-sm font-medium",
              stock.price_change_pct && stock.price_change_pct >= 0 ? "text-emerald-500" : "text-red-500",
            )}>
              {formatChangePct(stock.price_change_pct)}
            </span>
          </div>

          <div className="mb-3">
            <StockSparkline
              ticker={stock.ticker}
              width={200}
              height={36}
              positive={(stock.price_change_pct ?? 0) >= 0}
            />
          </div>

          {prediction && (
            <div className={cn("rounded-lg p-2.5 mb-3", config.bg)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <DirectionIcon className={cn("h-3.5 w-3.5", config.color)} />
                  <span className={cn("text-sm font-medium", config.color)}>{config.label}</span>
                </div>
                <span className={cn("text-sm font-bold", config.color)}>
                  {formatScore(prediction.score)}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-muted-foreground">
                  Confidence: {(prediction.confidence * 100).toFixed(0)}%
                </span>
                <span className="text-xs text-muted-foreground">
                  {prediction.timeframe}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Newspaper className="h-3 w-3" />
              <span>{stock.article_count} articles</span>
            </div>
            {stock.sector && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {stock.sector}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
