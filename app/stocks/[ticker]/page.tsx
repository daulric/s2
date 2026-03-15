import { Metadata } from "next"
import { Suspense } from "react"
import { notFound } from "next/navigation"
import Loading from "@/app/loading"
import StockDetailPage from "./page_client"
import { GetStockDetail, GetUserWatchlist } from "@/serverActions/GetStockDetails"

type Props = {
  params: Promise<{ ticker: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { ticker } = await params
  return {
    title: `s2 - ${ticker.toUpperCase()} Stock Prediction`,
    description: `News sentiment analysis and prediction for ${ticker.toUpperCase()}`,
  }
}

async function StockContent({ ticker }: { ticker: string }) {
  const [detail, watchlist] = await Promise.all([
    GetStockDetail(ticker),
    GetUserWatchlist(),
  ])

  if (!detail) notFound()

  const isWatched = watchlist.some((w) => w.ticker === detail.ticker)

  return <StockDetailPage detail={detail} isWatched={isWatched} />
}

export default async function PAGE({ params }: Props) {
  const { ticker } = await params

  return (
    <Suspense fallback={<Loading />}>
      <StockContent ticker={ticker} />
    </Suspense>
  )
}
