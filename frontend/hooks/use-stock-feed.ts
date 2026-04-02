"use client"

import { useEffect, useRef, useCallback } from "react"
import { signal, type Signal } from "@preact/signals-react"
import { createClient } from "@/lib/supabase/client"

type TradeUpdate = {
  price: number
  volume: number
  timestamp: number
}

type Subscriber = (update: TradeUpdate) => void

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"

function getWsUrl(): string {
  const base = BACKEND_URL.replace(/^http/, "ws")
  return `${base}/ws/stocks`
}

let ws: WebSocket | null = null
let wsReady = false
let connecting = false
let authRejected = false
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectAttempts = 0
const MAX_RECONNECT_DELAY = 30_000

const subscribedTickers = new Set<string>()
const subscribers = new Map<string, Set<Subscriber>>()
const latestPrices = new Map<string, Signal<TradeUpdate | null>>()
const pendingTickers: string[] = []

function clearReconnectTimer() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
}

async function getToken(): Promise<string | null> {
  const supabase = createClient()
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

async function connect() {
  if (subscribedTickers.size === 0) { console.log("[stock-feed] skip: no tickers"); return }
  if (connecting) { console.log("[stock-feed] skip: already connecting"); return }
  if (authRejected) { console.log("[stock-feed] skip: auth rejected"); return }
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    console.log("[stock-feed] skip: ws already open/connecting"); return
  }

  connecting = true
  const token = await getToken()
  if (!token || subscribedTickers.size === 0) {
    console.log("[stock-feed] skip: no token or tickers cleared", { token: !!token, tickers: subscribedTickers.size })
    connecting = false
    return
  }

  if (ws) {
    try { ws.close() } catch { /* ignore */ }
    ws = null
  }

  const wsUrl = `${getWsUrl()}?token=${encodeURIComponent(token)}`
  ws = new WebSocket(wsUrl)
  console.log("Connecting to stock feed", wsUrl)

  ws.onopen = () => {
    connecting = false
    wsReady = true
    reconnectAttempts = 0

    for (const ticker of subscribedTickers) {
      ws?.send(JSON.stringify({ type: "subscribe", symbol: ticker }))
    }

    for (const ticker of pendingTickers.splice(0)) {
      if (subscribedTickers.has(ticker)) continue
      subscribedTickers.add(ticker)
      ws?.send(JSON.stringify({ type: "subscribe", symbol: ticker }))
    }
  }

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data)

      if (msg.error) {
        if (msg.error.includes("subscription required") || msg.error.includes("token")) {
          authRejected = true
        }
        return
      }

      if (msg.type === "trade") {
        dispatch(msg.symbol, {
          price: msg.price,
          volume: msg.volume ?? 0,
          timestamp: msg.timestamp,
        })
      } else if (msg.type === "price_update") {
        dispatch(msg.symbol, {
          price: msg.price,
          volume: 0,
          timestamp: msg.timestamp,
        })
      }
    } catch {
      // malformed message
    }
  }

  ws.onclose = (ev) => {
    connecting = false
    wsReady = false
    ws = null

    // 4001 = bad token, 4003 = s2+ required — don't reconnect
    if (ev.code === 4001 || ev.code === 4003) {
      authRejected = true
      return
    }

    scheduleReconnect()
  }

  ws.onerror = () => {
    // onclose will fire after this
  }
}

function dispatch(symbol: string, update: TradeUpdate) {
  if (!subscribedTickers.has(symbol)) return

  const subs = subscribers.get(symbol)
  if (!subs?.size) return

  const priceSignal = latestPrices.get(symbol)
  if (priceSignal) priceSignal.value = update

  for (const cb of subs) cb(update)
}

function scheduleReconnect() {
  if (reconnectTimer) return
  if (subscribedTickers.size === 0) return
  if (authRejected) return

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
    console.log("[stock-feed] sending subscribe for", ticker)
    ws.send(JSON.stringify({ type: "subscribe", symbol: ticker }))
  } else if (connecting) {
    console.log("[stock-feed] queuing", ticker, "(connecting)")
    pendingTickers.push(ticker)
  } else {
    console.log("[stock-feed] triggering connect for", ticker, {
      wsReady, connecting, authRejected,
      wsState: ws?.readyState ?? "null",
    })
    authRejected = false
    if (ws && ws.readyState !== WebSocket.OPEN && ws.readyState !== WebSocket.CONNECTING) {
      ws = null
      wsReady = false
    }
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
  console.log("[stock-feed] addSubscriber", ticker)
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

export function shutdownAllStockFeeds(): void {
  clearReconnectTimer()
  reconnectAttempts = 0
  connecting = false
  authRejected = false
  subscribers.clear()
  subscribedTickers.clear()
  pendingTickers.length = 0

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
    console.log("[stock-feed] useStockFeed effect running for", ticker)
    callbackRef.current = onUpdate
  }, [onUpdate])

  useEffect(() => {
    console.log("[stock-feed] useStockFeed effect running for", ticker)
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
