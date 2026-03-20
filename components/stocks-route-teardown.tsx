"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { bumpSparklineListSession } from "@/lib/stocks/sparkline-candle-queue"
import { shutdownAllStockFeeds } from "@/hooks/use-stock-feed"

function teardownStocksNetworking() {
  shutdownAllStockFeeds()
  bumpSparklineListSession()
}

/**
 * Lives in the root layout so it still runs when navigating away from `/stocks/*`
 * (the stocks segment layout may unmount before pathname-driven effects there would fire).
 */
export function StocksRouteTeardown() {
  const pathname = usePathname()
  const prevRef = useRef<string | null>(null)

  useEffect(() => {
    const prev = prevRef.current
    prevRef.current = pathname

    if (prev !== null && prev.startsWith("/stocks") && !pathname.startsWith("/stocks")) {
      teardownStocksNetworking()
    }
  }, [pathname])

  return null
}
