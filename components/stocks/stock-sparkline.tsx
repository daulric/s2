"use client"

import { useEffect, useRef, useCallback } from "react"
import { useSignals, useSignal } from "@preact/signals-react/runtime"
import type { PriceCandle } from "@/lib/stocks/types"
import { enqueueSparklineWeekCandles } from "@/lib/stocks/sparkline-candle-queue"
import { useStockFeed, type TradeUpdate } from "@/hooks/use-stock-feed"

type SparklineProps = {
  ticker: string
  width?: number
  height?: number
  positive?: boolean
}

const sparklineCache = new Map<string, PriceCandle[]>()

function drawSparkline(
  canvas: HTMLCanvasElement,
  data: number[],
  width: number,
  height: number,
  positive: boolean,
) {
  const ctx = canvas.getContext("2d")
  if (!ctx || data.length < 2) return

  const dpr = window.devicePixelRatio || 1
  canvas.width = width * dpr
  canvas.height = height * dpr
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, width, height)

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const padding = 2

  const color = positive ? "#10b981" : "#ef4444"

  ctx.beginPath()
  ctx.strokeStyle = color
  ctx.lineWidth = 1.5
  ctx.lineJoin = "round"
  ctx.lineCap = "round"

  for (let i = 0; i < data.length; i++) {
    const x = (i / (data.length - 1)) * (width - padding * 2) + padding
    const y = height - padding - ((data[i] - min) / range) * (height - padding * 2)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()

  const gradient = ctx.createLinearGradient(0, 0, 0, height)
  gradient.addColorStop(0, positive ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)")
  gradient.addColorStop(1, "rgba(0,0,0,0)")

  ctx.lineTo(width - padding, height)
  ctx.lineTo(padding, height)
  ctx.closePath()
  ctx.fillStyle = gradient
  ctx.fill()
}

export function StockSparkline({ ticker, width = 100, height = 32, positive = true }: SparklineProps) {
  useSignals()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const shouldLoad = useSignal(false)
  const prices = useSignal<number[]>([])
  const throttleRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  const inView = shouldLoad.value

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ob = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          shouldLoad.value = true
        }
      },
      { root: null, rootMargin: "100px", threshold: 0 },
    )
    ob.observe(el)
    return () => ob.disconnect()
  }, [])

  useEffect(() => {
    if (!inView) return

    let cancelled = false
    mountedRef.current = true

    async function load() {
      let candles = sparklineCache.get(ticker)
      if (!candles) {
        candles = await enqueueSparklineWeekCandles(ticker)
        if (!cancelled && candles.length > 0) {
          sparklineCache.set(ticker, candles)
        }
      }
      if (!cancelled && candles && candles.length > 0) {
        prices.value = candles.map((c) => c.close)
      }
    }

    load()
    return () => {
      cancelled = true
      mountedRef.current = false
      if (throttleRef.current) {
        clearTimeout(throttleRef.current)
        throttleRef.current = null
      }
    }
  }, [ticker, inView])

  useStockFeed(
    ticker,
    useCallback((update: TradeUpdate) => {
      if (!mountedRef.current) return
      if (throttleRef.current) return
      throttleRef.current = setTimeout(() => {
        throttleRef.current = null
        if (!mountedRef.current) return

        const current = prices.value
        if (current.length === 0) return

        const updated = [...current.slice(1), update.price]
        prices.value = updated
      }, 3000)
    }, [prices]),
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || prices.value.length < 2) return

    const dynamicPositive = prices.value[prices.value.length - 1] >= prices.value[0]
    drawSparkline(canvas, prices.value, width, height, dynamicPositive)
  }, [prices.value, width, height])

  return (
    <div
      ref={containerRef}
      className="inline-block shrink-0"
      style={{ width, height, minWidth: width, minHeight: height }}
    >
      {prices.value.length >= 2 ? (
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          style={{ width, height }}
          className="block"
        />
      ) : null}
    </div>
  )
}
