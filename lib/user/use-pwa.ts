"use client"

import { useSignal, useSignals } from "@preact/signals-react/runtime"
import { useEffect } from "react"

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false
  if (window.matchMedia("(display-mode: standalone)").matches) return true

  const nav = window.navigator as Navigator & { standalone?: boolean }
  return nav.standalone === true
}

export function usePWA() {
  useSignals()
  const isPWA = useSignal<boolean>(false)

  useEffect(() => {
    if (isStandaloneDisplay()) {
      isPWA.value = true
    }
  }, [])

  return isPWA
}