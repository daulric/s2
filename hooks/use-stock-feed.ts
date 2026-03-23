"use client"

import { useEffect, useRef, useCallback } from "react"
import { signal, type Signal } from "@preact/signals-react"

type TradeUpdate = {
  price: number
  volume: number
  timestamp: number
}

type Subscriber = (update: TradeUpdate) => void

const FINNHUB_WS_URL = "wss://ws.finnhub.io"

let ws: WebSocket | null = null
let wsReady = false
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectAttempts = 0
const MAX_RECONNECT_DELAY = 30_000

const subscribedTickers = new Set<string>()
const subscribers = new Map<string, Set<Subscriber>>()
const latestPrices = new Map<string, Signal<TradeUpdate | null>>()

function getApiKey(): string {
  return process.env.NEXT_PUBLIC_FINNHUB_API_KEY ?? ""
}

function clearReconnectTimer() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
}

function connect() {
  const apiKey = getApiKey()
  if (!apiKey) return
  /** Avoid opening a socket after the user left (reconnect timer fired with 0 tickers). */
  if (subscribedTickers.size === 0) return

  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return
  }

  ws = new WebSocket(`${FINNHUB_WS_URL}?token=${apiKey}`)

  ws.onopen = () => {
    wsReady = true
    reconnectAttempts = 0

    for (const ticker of subscribedTickers) {
      ws?.send(JSON.stringify({ type: "subscribe", symbol: ticker }))
    }
  }

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data)
      if (msg.type !== "trade" || !msg.data) return

      const tradesBySymbol = new Map<string, TradeUpdate>()

      for (const trade of msg.data as { s: string; p: number; v: number; t: number }[]) {
        tradesBySymbol.set(trade.s, {
          price: trade.p,
          volume: trade.v,
          timestamp: trade.t,
        })
      }

      for (const [symbol, update] of tradesBySymbol) {
        if (!subscribedTickers.has(symbol)) continue

        const subs = subscribers.get(symbol)
        if (!subs?.size) continue

        const priceSignal = latestPrices.get(symbol)
        if (priceSignal) priceSignal.value = update

        for (const cb of subs) cb(update)
      }
    } catch {
      // malformed message
    }
  }

  ws.onclose = () => {
    wsReady = false
    scheduleReconnect()
  }

  ws.onerror = () => {
    ws?.close()
  }
}

function scheduleReconnect() {
  if (reconnectTimer) return
  if (subscribedTickers.size === 0) return

  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), MAX_RECONNECT_DELAY)
  reconnectAttempts++

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    connect()
  }, delay)
}

function subscribeTicker(ticker: string) {
  subscribedTickers.add(ticker)

  if (!latestPrices.has(ticker)) {
    latestPrices.set(ticker, signal<TradeUpdate | null>(null))
  }

  if (wsReady && ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "subscribe", symbol: ticker }))
  } else {
    connect()
  }
}

function unsubscribeTicker(ticker: string) {
  const subs = subscribers.get(ticker)
  if (subs && subs.size > 0) return

  subscribedTickers.delete(ticker)

  if (wsReady && ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "unsubscribe", symbol: ticker }))
  }

  if (subscribedTickers.size === 0 && ws) {
    clearReconnectTimer()
    reconnectAttempts = 0
    ws.close()
    ws = null
    wsReady = false
  }
}

function addSubscriber(ticker: string, cb: Subscriber) {
  if (!subscribers.has(ticker)) {
    subscribers.set(ticker, new Set())
  }
  subscribers.get(ticker)!.add(cb)
  subscribeTicker(ticker)
}

function removeSubscriber(ticker: string, cb: Subscriber) {
  const subs = subscribers.get(ticker)
  if (subs) {
    subs.delete(cb)
    if (subs.size === 0) {
      subscribers.delete(ticker)
      unsubscribeTicker(ticker)
    }
  }
}

/** Call when leaving `/stocks/*` — closes WS, clears subs, stops reconnects. */
export function shutdownAllStockFeeds(): void {
  clearReconnectTimer()
  reconnectAttempts = 0
  subscribers.clear()
  subscribedTickers.clear()

  const socket = ws
  ws = null
  wsReady = false

  if (socket) {
    socket.onopen = null
    socket.onmessage = null
    socket.onerror = null
    socket.onclose = null
    try {
      socket.close()
    } catch {
      /* ignore */
    }
  }

  latestPrices.clear()
}

export function useStockFeed(ticker: string, onUpdate?: (update: TradeUpdate) => void) {
  const callbackRef = useRef(onUpdate)

  useEffect(() => {
    callbackRef.current = onUpdate
  }, [onUpdate])

  useEffect(() => {
    const cb: Subscriber = (update) => {
      callbackRef.current?.(update)
    }

    addSubscriber(ticker, cb)
    return () => removeSubscriber(ticker, cb)
  }, [ticker])

  if (!latestPrices.has(ticker)) {
    latestPrices.set(ticker, signal<TradeUpdate | null>(null))
  }
  return latestPrices.get(ticker)!
}

export function useStockFeedMulti(tickers: string[], onUpdate?: (ticker: string, update: TradeUpdate) => void) {
  const callbackRef = useRef(onUpdate)

  useEffect(() => {
    callbackRef.current = onUpdate
  }, [onUpdate])

  useEffect(() => {
    const cbs = new Map<string, Subscriber>()

    for (const ticker of tickers) {
      const cb: Subscriber = (update) => {
        callbackRef.current?.(ticker, update)
      }
      cbs.set(ticker, cb)
      addSubscriber(ticker, cb)
    }

    return () => {
      for (const [ticker, cb] of cbs) {
        removeSubscriber(ticker, cb)
      }
    }
  }, [tickers])

  const result = useCallback((ticker: string) => {
    if (!latestPrices.has(ticker)) {
      latestPrices.set(ticker, signal<TradeUpdate | null>(null))
    }
    return latestPrices.get(ticker)!
  }, [])

  return result
}

export type { TradeUpdate }
