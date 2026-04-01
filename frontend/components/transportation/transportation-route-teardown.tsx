"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { shutdownAllTransportationFeeds } from "@/hooks/use-transportation-feed"

export function TransportationRouteTeardown() {
  const pathname = usePathname()
  const prevRef = useRef<string | null>(null)

  useEffect(() => {
    const prev = prevRef.current
    prevRef.current = pathname

    if (prev !== null && prev.startsWith("/transportation") && !pathname.startsWith("/transportation")) {
      shutdownAllTransportationFeeds()
    }
  }, [pathname])

  return null
}
