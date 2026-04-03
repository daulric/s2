"use client"

import { useEffect, useRef, useCallback } from "react"
import { signal, type Signal } from "@preact/signals-react"

type TradeUpdate = {
  price: number
  volume: number
  timestamp: number
}

const latestPrices = new Map<string, Signal<TradeUpdate | null>>()

export function shutdownAllStockFeeds(): void {
  latestPrices.clear()
}

export function useStockFeed(ticker: string, _onUpdate?: (update: TradeUpdate) => void) {
  if (!latestPrices.has(ticker)) {
    latestPrices.set(ticker, signal<TradeUpdate | null>(null))
  }
  return latestPrices.get(ticker)!
}

export function useStockFeedMulti(tickers: string[], _onUpdate?: (ticker: string, update: TradeUpdate) => void) {
  const result = useCallback((ticker: string) => {
    if (!latestPrices.has(ticker)) {
      latestPrices.set(ticker, signal<TradeUpdate | null>(null))
    }
    return latestPrices.get(ticker)!
  }, [])

  return result
}

export type { TradeUpdate }
