"use client"

import { useEffect, useRef } from "react"
import { useSignals, useSignal } from "@preact/signals-react/runtime"
import { cn } from "@/lib/utils"
import { formatStockPriceUsd } from "@/lib/stocks/format-stock-price"

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

type AnimatedStockPriceProps = {
  value: number | null
  className?: string
  duration?: number
  colorHoldMs?: number
}

type PriceTrend = "up" | "down" | "flat"

export function AnimatedStockPrice({
  value,
  className,
  duration = 420,
  colorHoldMs = 320,
}: AnimatedStockPriceProps) {
  useSignals()
  const display = useSignal<number | null>(value)
  const trend = useSignal<PriceTrend>("flat")
  const resetColorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const clearColorReset = () => {
      if (resetColorTimerRef.current) {
        clearTimeout(resetColorTimerRef.current)
        resetColorTimerRef.current = null
      }
    }
    clearColorReset()

    if (value === null) {
      display.value = null
      trend.value = "flat"
      return
    }

    const from = display.value
    if (from === null || Math.abs(from - value) < 1e-9) {
      display.value = value
      trend.value = "flat"
      return
    }

    trend.value = value > from ? "up" : "down"

    let raf = 0
    let cancelled = false
    const start = performance.now()
    const startVal = from

    const tick = (now: number) => {
      if (cancelled) return
      const t = Math.min(1, (now - start) / duration)
      const eased = easeOutCubic(t)
      const next = startVal + (value - startVal) * eased
      display.value = next
      if (t < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        display.value = value
        clearColorReset()
        resetColorTimerRef.current = setTimeout(() => {
          resetColorTimerRef.current = null
          if (!cancelled) trend.value = "flat"
        }, colorHoldMs)
      }
    }

    raf = requestAnimationFrame(tick)
    return () => {
      cancelled = true
      clearColorReset()
      cancelAnimationFrame(raf)
    }
  }, [value, duration, colorHoldMs, display, trend])

  if (display.value === null) {
    return <span className={className}>—</span>
  }

  const t = trend.value
  return (
    <span
      className={cn(
        "tabular-nums text-foreground transition-colors duration-500",
        t === "up" && "text-emerald-500",
        t === "down" && "text-red-500",
        className,
      )}
    >
      {formatStockPriceUsd(display.value)}
    </span>
  )
}
