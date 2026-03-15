import { Metadata } from "next"
import { Suspense } from "react"
import Loading from "@/app/loading"
import StocksPage from "./page_client"
import { GetAllStocks, GetTopMovers, GetUserWatchlist } from "@/serverActions/GetStockDetails"

export const metadata: Metadata = {
  title: "s2 - Stock Predictions",
  description: "AI-powered stock predictions based on news sentiment analysis",
}

async function StocksContent({ initialTab }: { initialTab: string }) {
  const [stocks, topMovers, watchlist] = await Promise.all([
    GetAllStocks(),
    GetTopMovers(10),
    GetUserWatchlist(),
  ])

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

export default async function PAGE({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams
  const initialTab = ["all", "movers", "watchlist"].includes(tab ?? "") ? tab! : "all"

  return (
    <Suspense fallback={<Loading />}>
      <StocksContent initialTab={initialTab} />
    </Suspense>
  )
}
