"use client"

import { useCallback } from "react"
import { useRouter } from "next/navigation"
import { useSignals, useSignal } from "@preact/signals-react/runtime"
import { StockCard, UsMarketStatusBadge, EcseMarketStatusBadge, EuMarketStatusBadge } from "@/components/stocks"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  TrendingUp,
  Search,
  Star,
  BarChart3,
  AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ToggleWatchlist } from "@/serverActions/GetStockDetails"
import type { StockWithPrediction, StockExchange } from "@/lib/stocks/types"
import { useAuth } from "@/context/AuthProvider"
import { toast } from "sonner"

function listDisplayDirection(s: StockWithPrediction): "bullish" | "bearish" | "neutral" {
  return s.prediction?.direction ?? s.article_majority_direction ?? "neutral"
}

type StocksPageProps = {
  stocks: StockWithPrediction[]
  topMovers: StockWithPrediction[]
  watchlistTickers: string[]
  initialTab?: string
}

const EXCHANGES: { label: string; value: "All" | StockExchange }[] = [
  { label: "All Exchanges", value: "All" },
  { label: "NYSE", value: "NYSE" },
  { label: "Nasdaq", value: "Nasdaq" },
  { label: "EU", value: "EU" },
  { label: "ECSE", value: "ECSE" },
]

const SECTORS = [
  "All",
  "Technology",
  "Financials",
  "Healthcare",
  "Consumer Cyclical",
  "Consumer Defensive",
  "Communication",
  "Energy",
  "Industrials",
]

export default function StocksPage({ stocks, topMovers, watchlistTickers, initialTab = "all" }: StocksPageProps) {
  useSignals()
  const router = useRouter()
  const { user: { user } } = useAuth()

  const PAGE_SIZE = 20
  const search = useSignal("")
  const selectedExchange = useSignal<"All" | StockExchange>("All")
  const selectedSector = useSignal("All")
  const watchlist = useSignal<Set<string>>(new Set(watchlistTickers))
  const sortBy = useSignal<"ticker" | "score" | "change">("score")
  const visibleCount = useSignal(PAGE_SIZE)

  const handleToggleWatchlist = useCallback(async (ticker: string) => {
    if (!user) {
      toast.error("Sign in to use watchlists")
      return
    }
    try {
      const { added } = await ToggleWatchlist(ticker)
      const next = new Set(watchlist.value)
      if (added) {
        next.add(ticker)
        toast.success(`${ticker} added to watchlist`)
      } else {
        next.delete(ticker)
        toast.success(`${ticker} removed from watchlist`)
      }
      watchlist.value = next
    } catch {
      toast.error("Failed to update watchlist")
    }
  }, [user, watchlist])

  const allFilteredStocks = stocks
    .filter((s) => {
      if (selectedExchange.value !== "All" && s.exchange !== selectedExchange.value) return false
      return true
    })
    .filter((s) => {
      if (search.value) {
        const q = search.value.toLowerCase()
        return s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
      }
      return true
    })
    .filter((s) => {
      if (selectedSector.value === "All") return true
      return s.sector === selectedSector.value
    })
    .sort((a, b) => {
      if (sortBy.value === "ticker") return a.ticker.localeCompare(b.ticker)
      if (sortBy.value === "change") return (b.price_change_pct ?? 0) - (a.price_change_pct ?? 0)
      return (
        Math.abs(b.prediction?.score ?? b.sentiment_avg ?? 0) -
        Math.abs(a.prediction?.score ?? a.sentiment_avg ?? 0)
      )
    })

  const filteredStocks = allFilteredStocks.slice(0, visibleCount.value)
  const hasMore = allFilteredStocks.length > visibleCount.value

  const watchedStocks = stocks.filter((s) => watchlist.value.has(s.ticker))

  const exchangeFilteredStocks = selectedExchange.value === "All"
    ? stocks
    : stocks.filter((s) => s.exchange === selectedExchange.value)
  const bullishCount = exchangeFilteredStocks.filter((s) => listDisplayDirection(s) === "bullish").length
  const bearishCount = exchangeFilteredStocks.filter((s) => listDisplayDirection(s) === "bearish").length
  const neutralCount = exchangeFilteredStocks.filter((s) => listDisplayDirection(s) === "neutral").length

  return (
    <main className="min-h-screen pt-15 p-4 pb-8 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-3xl font-bold">stock predictions</h1>
            {(selectedExchange.value === "All" || selectedExchange.value === "NYSE" || selectedExchange.value === "Nasdaq") && (
              <UsMarketStatusBadge />
            )}
            {(selectedExchange.value === "All" || selectedExchange.value === "EU") && (
              <EuMarketStatusBadge />
            )}
            {(selectedExchange.value === "All" || selectedExchange.value === "ECSE") && (
              <EcseMarketStatusBadge />
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            news-driven sentiment analysis across {exchangeFilteredStocks.length.toLocaleString()} stocks
            {selectedExchange.value !== "All" && ` on ${selectedExchange.value}`}
          </p>
        </div>

        <div className="mb-6 p-4 rounded-lg border bg-card">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Not financial advice. Predictions are based on news sentiment analysis and may be inaccurate.
              Past accuracy does not guarantee future results. Consult a financial advisor before investing.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="rounded-lg border bg-card p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <span className="text-2xl font-bold text-emerald-500">{bullishCount}</span>
            </div>
            <p className="text-xs text-muted-foreground">Bullish</p>
          </div>
          <div className="rounded-lg border bg-card p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <BarChart3 className="h-4 w-4 text-yellow-500" />
              <span className="text-2xl font-bold text-yellow-500">{neutralCount}</span>
            </div>
            <p className="text-xs text-muted-foreground">Neutral</p>
          </div>
          <div className="rounded-lg border bg-card p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />
              <span className="text-2xl font-bold text-red-500">{bearishCount}</span>
            </div>
            <p className="text-xs text-muted-foreground">Bearish</p>
          </div>
        </div>
        {stocks.some((s) => s.article_count === 0 && s.prediction == null) && (
          <p className="text-xs text-muted-foreground text-center -mt-3 mb-6">
            Neutral includes stocks with no scored news yet
          </p>
        )}

        <Tabs
          defaultValue={initialTab}
          onValueChange={(value) => {
            const params = new URLSearchParams(window.location.search)
            if (value === "all") {
              params.delete("tab")
            } else {
              params.set("tab", value)
            }
            const qs = params.toString()
            router.replace(`/stocks${qs ? `?${qs}` : ""}`, { scroll: false })
          }}
        >
          <TabsList className="mb-4">
            <TabsTrigger value="all">
              <BarChart3 className="h-4 w-4 mr-1.5" />
              All Stocks
            </TabsTrigger>
            <TabsTrigger value="movers">
              <TrendingUp className="h-4 w-4 mr-1.5" />
              Top Movers
            </TabsTrigger>
            <TabsTrigger value="watchlist">
              <Star className="h-4 w-4 mr-1.5" />
              Watchlist
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search stocks..."
                  className="pl-9"
                  value={search.value}
                  onChange={(e) => { search.value = e.target.value; visibleCount.value = PAGE_SIZE }}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={sortBy.value === "score" ? "default" : "outline"}
                  size="sm"
                  onClick={() => { sortBy.value = "score" }}
                >
                  By Score
                </Button>
                <Button
                  variant={sortBy.value === "change" ? "default" : "outline"}
                  size="sm"
                  onClick={() => { sortBy.value = "change" }}
                >
                  By Change
                </Button>
                <Button
                  variant={sortBy.value === "ticker" ? "default" : "outline"}
                  size="sm"
                  onClick={() => { sortBy.value = "ticker" }}
                >
                  A–Z
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-3">
              {EXCHANGES.map((ex) => (
                <Badge
                  key={ex.value}
                  variant={selectedExchange.value === ex.value ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer transition-colors",
                    selectedExchange.value === ex.value && "bg-primary text-primary-foreground",
                  )}
                  onClick={() => { selectedExchange.value = ex.value; visibleCount.value = PAGE_SIZE }}
                >
                  {ex.label}
                </Badge>
              ))}
            </div>

            <div className="flex flex-wrap gap-1.5 mb-4">
              {SECTORS.map((sector) => (
                <Badge
                  key={sector}
                  variant={selectedSector.value === sector ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer transition-colors",
                    selectedSector.value === sector && "bg-primary text-primary-foreground",
                  )}
                  onClick={() => { selectedSector.value = sector; visibleCount.value = PAGE_SIZE }}
                >
                  {sector}
                </Badge>
              ))}
            </div>

            <p className="text-sm text-muted-foreground mb-3">
              Showing {filteredStocks.length.toLocaleString()} of {allFilteredStocks.length.toLocaleString()} stocks
              {search.value && ` matching "${search.value}"`}
            </p>

            {filteredStocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground/40 mb-3" />
                <h2 className="text-lg font-semibold mb-1">no stocks found</h2>
                <p className="text-muted-foreground text-sm">
                  {search.value ? "try a different search term" : "stock data will appear after the first ingestion run"}
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredStocks.map((stock) => (
                    <div key={stock.ticker} className="relative group">
                      <StockCard stock={stock} />
                      {user && (
                        <button
                          onClick={(e) => { e.preventDefault(); handleToggleWatchlist(stock.ticker) }}
                          className={cn(
                            "absolute top-2 right-2 p-1.5 rounded-md transition-all z-10",
                            "opacity-0 group-hover:opacity-100",
                            watchlist.value.has(stock.ticker)
                              ? "text-yellow-500 bg-yellow-500/10"
                              : "text-muted-foreground hover:text-yellow-500 bg-background/80",
                          )}
                        >
                          <Star className={cn("h-4 w-4", watchlist.value.has(stock.ticker) && "fill-current")} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {hasMore && (
                  <div className="flex justify-center mt-6">
                    <Button
                      variant="outline"
                      onClick={() => {
                        visibleCount.value = Math.min(
                          visibleCount.value + PAGE_SIZE,
                          allFilteredStocks.length,
                        )
                      }}
                    >
                      Load {Math.min(PAGE_SIZE, allFilteredStocks.length - visibleCount.value)} more
                      {" · "}
                      {(allFilteredStocks.length - visibleCount.value).toLocaleString()} remaining
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="movers">
            {topMovers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <TrendingUp className="h-12 w-12 text-muted-foreground/40 mb-3" />
                <h2 className="text-lg font-semibold mb-1">no predictions yet</h2>
                <p className="text-muted-foreground text-sm">
                  top movers will appear after the first sentiment analysis run
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {topMovers.map((stock, i) => (
                  <div key={stock.ticker} className="flex items-center gap-3">
                    <span className="text-lg font-bold text-muted-foreground w-6 text-right">{i + 1}</span>
                    <div className="flex-1">
                      <StockCard stock={stock} compact />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="watchlist">
            {!user ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Star className="h-12 w-12 text-muted-foreground/40 mb-3" />
                <h2 className="text-lg font-semibold mb-1">sign in to use watchlists</h2>
                <p className="text-muted-foreground text-sm">
                  track your favorite stocks by adding them to your watchlist
                </p>
              </div>
            ) : watchedStocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Star className="h-12 w-12 text-muted-foreground/40 mb-3" />
                <h2 className="text-lg font-semibold mb-1">watchlist empty</h2>
                <p className="text-muted-foreground text-sm">
                  hover over a stock card and click the star to add it
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {watchedStocks.map((stock) => (
                  <div key={stock.ticker} className="relative group">
                    <StockCard stock={stock} />
                    <button
                      onClick={(e) => { e.preventDefault(); handleToggleWatchlist(stock.ticker) }}
                      className="absolute top-2 right-2 p-1.5 rounded-md text-yellow-500 bg-yellow-500/10 z-10"
                    >
                      <Star className="h-4 w-4 fill-current" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
