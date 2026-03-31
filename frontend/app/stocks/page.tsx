import { Metadata } from "next"
import { Suspense } from "react"
import { StocksPageSkeleton } from "@/components/layout/skeletons"
import StocksPage from "./page_client"
import { GetAllStocks, GetUserWatchlist } from "@/serverActions/GetStockDetails"

export const metadata: Metadata = {
  title: "s2 - Stock Predictions",
  description: "AI-powered stock predictions based on news sentiment analysis",
}

async function StocksContent({ initialTab }: { initialTab: string }) {
  const [stocks, watchlist] = await Promise.all([
    GetAllStocks(),
    GetUserWatchlist(),
  ])

  const topMovers = stocks
    .filter((s) => s.prediction !== null || s.article_count > 0)
    .sort((a, b) => {
      const scoreA = a.prediction?.score ?? a.sentiment_avg ?? 0
      const scoreB = b.prediction?.score ?? b.sentiment_avg ?? 0
      return Math.abs(scoreB) - Math.abs(scoreA)
    })
    .slice(0, 10)

  const watchlistTickers = watchlist.map((w) => w.ticker)

  return (
    <StocksPage
      stocks={stocks}
      topMovers={topMovers}
      watchlistTickers={watchlistTickers}
      initialTab={initialTab}
    />
  )
}

export default async function PAGE({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  const initialTab = ["all", "movers", "watchlist"].includes(tab ?? "") ? tab! : "all"

  return (
    <Suspense fallback={<StocksPageSkeleton />}>
      <StocksContent initialTab={initialTab} />
    </Suspense>
  )
}
