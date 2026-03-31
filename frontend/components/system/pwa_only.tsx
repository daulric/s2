"use client"

import { useSignal, useSignals } from "@preact/signals-react/runtime"
import { useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { isStandaloneDisplay } from "@/lib/user/use-pwa"

type NonPwaOnlyProps = {
  children: ReactNode
  redirectHref?: string
  fallback?: ReactNode
}

export function NonPwaOnly({
  children,
  redirectHref = "/",
  fallback = null,
}: NonPwaOnlyProps) {
  useSignals()
  const ready = useSignal(false)
  const router = useRouter()

  useEffect(() => {
    if (isStandaloneDisplay()) {
      router.replace(redirectHref)
      return
    }
    ready.value = true
  }, [router, redirectHref, ready])

  if (!ready.value) return fallback
  return <>{children}</>
}
