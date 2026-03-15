"use client"

import { useEffect, useRef, useCallback } from "react"
import { useSignals, useSignal } from "@preact/signals-react/runtime"
import type { PriceCandle } from "@/lib/stocks/types"
import { GetStockCandles } from "@/serverActions/GetStockDetails"
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
  const prices = useSignal<number[]>([])
  const throttleRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      let candles = sparklineCache.get(ticker)
      if (!candles) {
        candles = await GetStockCandles(ticker, "1W")
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
      if (throttleRef.current) clearTimeout(throttleRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker])

  useStockFeed(ticker, useCallback((update: TradeUpdate) => {
    if (throttleRef.current) return
    throttleRef.current = setTimeout(() => {
      throttleRef.current = null

      const current = prices.value
      if (current.length === 0) return

      const updated = [...current.slice(1), update.price]
      prices.value = updated
    }, 3000)
  }, [prices]))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || prices.value.length < 2) return

    const dynamicPositive = prices.value[prices.value.length - 1] >= prices.value[0]
    drawSparkline(canvas, prices.value, width, height, dynamicPositive)
  }, [prices.value, width, height, positive])

  if (prices.value.length < 2) return null

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ width, height }}
      className="block"
    />
  )
}
