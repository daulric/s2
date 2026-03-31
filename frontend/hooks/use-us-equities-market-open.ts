"use client"

import { useEffect } from "react"
import { useSignals, useSignal } from "@preact/signals-react/runtime"
import {
  getUsEquitiesMarketPhase,
  type UsEquitiesMarketPhase,
} from "@/lib/stocks/us-market-hours"

export function useUsEquitiesMarketPhase(pollMs = 30_000): UsEquitiesMarketPhase {
  useSignals()
  const phase = useSignal<UsEquitiesMarketPhase>(getUsEquitiesMarketPhase())

  useEffect(() => {
    const tick = () => {
      phase.value = getUsEquitiesMarketPhase()
    }
    tick()
    const id = setInterval(tick, pollMs)
    return () => clearInterval(id)
  }, [pollMs, phase])

  return phase.value
}

export function useUsEquitiesMarketOpen(pollMs = 30_000): boolean {
  return useUsEquitiesMarketPhase(pollMs) === "regular"
}
