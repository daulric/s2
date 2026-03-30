"use client"

import { useEffect } from "react"
import { useSignals, useSignal } from "@preact/signals-react/runtime"
import {
  getEuMarketPhase,
  type EuMarketPhase,
} from "@/lib/stocks/eu-market-hours"

export function useEuMarketPhase(pollMs = 30_000): EuMarketPhase {
  useSignals()
  const phase = useSignal<EuMarketPhase>(getEuMarketPhase())

  useEffect(() => {
    const tick = () => {
      phase.value = getEuMarketPhase()
    }
    tick()
    const id = setInterval(tick, pollMs)
    return () => clearInterval(id)
  }, [pollMs, phase])

  return phase.value
}

export function useEuMarketOpen(pollMs = 30_000): boolean {
  return useEuMarketPhase(pollMs) === "regular"
}
