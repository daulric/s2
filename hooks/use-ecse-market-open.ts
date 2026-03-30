"use client"

import { useEffect } from "react"
import { useSignals, useSignal } from "@preact/signals-react/runtime"
import {
  getEcseMarketPhase,
  type EcseMarketPhase,
} from "@/lib/stocks/ecse-market-hours"

export function useEcseMarketPhase(pollMs = 30_000): EcseMarketPhase {
  useSignals()
  const phase = useSignal<EcseMarketPhase>(getEcseMarketPhase())

  useEffect(() => {
    const tick = () => {
      phase.value = getEcseMarketPhase()
    }
    tick()
    const id = setInterval(tick, pollMs)
    return () => clearInterval(id)
  }, [pollMs, phase])

  return phase.value
}

export function useEcseMarketOpen(pollMs = 30_000): boolean {
  return useEcseMarketPhase(pollMs) === "regular"
}
