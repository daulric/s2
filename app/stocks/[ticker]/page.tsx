import type { Metadata } from "next"
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

async function StockContent({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params

  const [detail, watchlist] = await Promise.all([
    GetStockDetail(ticker),
    GetUserWatchlist(),
  ])

  if (!detail) notFound()

  const isWatched = watchlist.some((w) => w.ticker === detail.ticker)

  return <StockDetailPage detail={detail} isWatched={isWatched} />
}

export default function PAGE({ params }: Props) {
  return (
    <Suspense fallback={<Loading />}>
      <StockContent params={params} />
    </Suspense>
  )
}
