"use client"

import { useCallback } from "react"
import { useSignals, useSignal } from "@preact/signals-react/runtime"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  ArrowLeft,
  ExternalLink,
  Newspaper,
  Clock,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ToggleWatchlist } from "@/serverActions/GetStockDetails"
import type { StockDetail, ArticleSentiment } from "@/lib/stocks/types"
import { StockChart } from "@/components/stock-chart"
import { useStockFeed } from "@/hooks/use-stock-feed"
import { useAuth } from "@/context/AuthProvider"
import { toast } from "sonner"

type StockDetailPageProps = {
  detail: StockDetail
  isWatched: boolean
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

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function sentimentBadge(sentiment: ArticleSentiment | null) {
  if (!sentiment) return null
  const config = {
    bullish: { color: "text-emerald-500 border-emerald-500/20", label: "Bullish" },
    bearish: { color: "text-red-500 border-red-500/20", label: "Bearish" },
    neutral: { color: "text-yellow-500 border-yellow-500/20", label: "Neutral" },
  }[sentiment.sentiment_label]

  return (
    <Badge variant="outline" className={cn("text-[10px]", config.color)}>
      {config.label} ({(sentiment.confidence * 100).toFixed(0)}%)
    </Badge>
  )
}

const directionConfig = {
  bullish: {
    icon: TrendingUp,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    label: "Bullish",
  },
  bearish: {
    icon: TrendingDown,
    color: "text-red-500",
    bg: "bg-red-500/10",
    label: "Bearish",
  },
  neutral: {
    icon: Minus,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
    label: "Neutral",
  },
}

export default function StockDetailPage({ detail, isWatched }: StockDetailPageProps) {
  useSignals()
  const { user: { user } } = useAuth()
  const watched = useSignal(isWatched)
  const latestTrade = useStockFeed(detail.ticker)

  const livePrice = latestTrade.value?.price ?? null
  const displayPrice = livePrice ?? detail.last_price
  const basePct = detail.price_change_pct ?? 0
  const livePct = livePrice !== null && detail.last_price
    ? ((livePrice - detail.last_price * (1 - basePct / 100)) / (detail.last_price * (1 - basePct / 100))) * 100
    : basePct

  const handleToggleWatchlist = useCallback(async () => {
    if (!user) {
      toast.error("Sign in to use watchlists")
      return
    }
    try {
      const { added } = await ToggleWatchlist(detail.ticker)
      watched.value = added
      toast.success(added ? `${detail.ticker} added to watchlist` : `${detail.ticker} removed from watchlist`)
    } catch {
      toast.error("Failed to update watchlist")
    }
  }, [user, detail.ticker, watched])

  const prediction = detail.prediction
  const direction = prediction?.direction ?? "neutral"
  const config = directionConfig[direction]
  const DirectionIcon = config.icon

  const bullishArticles = detail.articles.filter((a) => a.sentiment?.sentiment_label === "bullish").length
  const bearishArticles = detail.articles.filter((a) => a.sentiment?.sentiment_label === "bearish").length
  const neutralArticles = detail.articles.filter((a) => a.sentiment?.sentiment_label === "neutral").length

  return (
    <main className="min-h-screen pt-15 p-4 pb-8 bg-background">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Link href="/stocks" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Stocks
          </Link>

          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">{detail.ticker}</h1>
                {detail.sector && (
                  <Badge variant="secondary">{detail.sector}</Badge>
                )}
              </div>
              <p className="text-muted-foreground mt-1">{detail.name}</p>
            </div>
            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleWatchlist}
                className={cn(watched.value && "text-yellow-500 border-yellow-500/30")}
              >
                <Star className={cn("h-4 w-4 mr-1.5", watched.value && "fill-current")} />
                {watched.value ? "Watching" : "Watch"}
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm text-muted-foreground">Current Price</p>
                {livePrice !== null && (
                  <span className="flex items-center gap-1 text-xs text-emerald-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2">
                <span className={cn("text-2xl font-bold", livePrice !== null && "tabular-nums")}>{formatPrice(displayPrice)}</span>
                <span className={cn(
                  "text-sm font-medium",
                  livePct >= 0 ? "text-emerald-500" : "text-red-500",
                )}>
                  {formatChangePct(livePct)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-1">Prediction</p>
              {prediction ? (
                <div className="flex items-center gap-2">
                  <div className={cn("w-8 h-8 rounded-md flex items-center justify-center", config.bg)}>
                    <DirectionIcon className={cn("h-4 w-4", config.color)} />
                  </div>
                  <div>
                    <span className={cn("text-lg font-bold", config.color)}>{config.label}</span>
                    <p className="text-xs text-muted-foreground">
                      Score: {(prediction.score * 100).toFixed(0)} | Confidence: {(prediction.confidence * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-lg text-muted-foreground">No prediction yet</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-1">Article Sentiment</p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-sm">{bullishArticles}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <span className="text-sm">{neutralArticles}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-sm">{bearishArticles}</span>
                </div>
              </div>
              {detail.articles.length > 0 && (
                <div className="mt-2 h-2 rounded-full overflow-hidden bg-muted flex">
                  {bullishArticles > 0 && (
                    <div className="bg-emerald-500 h-full" style={{ width: `${(bullishArticles / detail.articles.length) * 100}%` }} />
                  )}
                  {neutralArticles > 0 && (
                    <div className="bg-yellow-500 h-full" style={{ width: `${(neutralArticles / detail.articles.length) * 100}%` }} />
                  )}
                  {bearishArticles > 0 && (
                    <div className="bg-red-500 h-full" style={{ width: `${(bearishArticles / detail.articles.length) * 100}%` }} />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <StockChart
          ticker={detail.ticker}
          initialCandles={detail.candles}
          priceChangePct={detail.price_change_pct}
        />

        {detail.prediction_history.length > 1 && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Prediction History
              </h2>
              <div className="space-y-2">
                {detail.prediction_history.slice(0, 10).map((p) => {
                  const pConfig = directionConfig[p.direction]
                  const PIcon = pConfig.icon
                  return (
                    <div key={p.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                      <div className="flex items-center gap-2">
                        <PIcon className={cn("h-3.5 w-3.5", pConfig.color)} />
                        <span className={cn("text-sm font-medium", pConfig.color)}>{pConfig.label}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>Score: {(p.score * 100).toFixed(0)}</span>
                        <span>{p.article_count} articles</span>
                        <span>{timeAgo(p.created_at)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <div>
          <h2 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <Newspaper className="h-5 w-5" />
            Recent Articles ({detail.articles.length})
          </h2>
          {detail.articles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Newspaper className="h-10 w-10 text-muted-foreground/40 mb-2" />
              <p className="text-muted-foreground text-sm">no articles collected yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {detail.articles.map((article) => (
                <Card key={article.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Badge variant="outline" className="text-[10px] shrink-0">{article.source}</Badge>
                          {sentimentBadge(article.sentiment)}
                          <span className="text-xs text-muted-foreground">{timeAgo(article.published_at)}</span>
                        </div>
                        <h3 className="font-medium text-sm line-clamp-2 mb-1">{article.headline}</h3>
                        {article.summary && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{article.summary}</p>
                        )}
                      </div>
                      {article.url && (
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
