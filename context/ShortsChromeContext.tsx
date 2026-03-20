"use client"

import { createContext, useContext, useMemo, useRef, type ReactNode } from "react"
import type { Signal } from "@preact/signals-react"
import { useSignal } from "@preact/signals-react"

export type ShortsChromeContextValue = {
  /** Subscribe with `useSignals()` + `.value` for fine-grained header updates */
  hideSiteHeader: Signal<boolean>
  beginShortsFullscreen: () => void
  endShortsFullscreen: () => void
}

const ShortsChromeContext = createContext<ShortsChromeContextValue | null>(null)

/**
 * Ref-counted fullscreen chrome. `hideSiteHeader` is a signal so only components that read
 * `.value` (with `useSignals()`) re-render when it changes — not every context consumer.
 */
export function ShortsChromeProvider({ children }: { children: ReactNode }) {
  const hideSiteHeader = useSignal(false)
  const countRef = useRef(0)

  const value = useMemo<ShortsChromeContextValue>(
    () => ({
      hideSiteHeader,
      beginShortsFullscreen() {
        countRef.current += 1
        hideSiteHeader.value = true
      },
      endShortsFullscreen() {
        countRef.current = Math.max(0, countRef.current - 1)
        hideSiteHeader.value = countRef.current > 0
      },
    }),
    [hideSiteHeader],
  )

  return <ShortsChromeContext.Provider value={value}>{children}</ShortsChromeContext.Provider>
}

export function useShortsChrome() {
  const ctx = useContext(ShortsChromeContext)
  if (!ctx) {
    throw new Error("useShortsChrome must be used within ShortsChromeProvider")
  }
  return ctx
}

export function useShortsChromeOptional() {
  return useContext(ShortsChromeContext)
}
