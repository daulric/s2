"use client"

import { useEffect, useState } from "react"
import {
  getUsEquitiesMarketPhase,
  type UsEquitiesMarketPhase,
} from "@/lib/stocks/us-market-hours"

export function useUsEquitiesMarketPhase(pollMs = 30_000): UsEquitiesMarketPhase {
  const [phase, setPhase] = useState(() => getUsEquitiesMarketPhase())

  useEffect(() => {
    const tick = () => setPhase(getUsEquitiesMarketPhase())
    tick()
    const id = setInterval(tick, pollMs)
    return () => clearInterval(id)
  }, [pollMs])

  return phase
}

export function useUsEquitiesMarketOpen(pollMs = 30_000): boolean {
  return useUsEquitiesMarketPhase(pollMs) === "regular"
}
