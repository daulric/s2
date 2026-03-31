"use client"

import Link from "next/link"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Compass } from "lucide-react"
import { useAuth } from "@/context/AuthProvider"

export function HomeLandingClient() {
  const router = useRouter()
  const { user: userState, loading } = useAuth()

  useEffect(() => {
    if (!loading && userState.user) {
      router.replace("/home")
    }
  }, [loading, userState.user, router])

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
      <Link
        href="/auth"
        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-foreground px-6 text-sm font-medium text-background transition-opacity hover:opacity-80 w-full sm:w-auto"
      >
        get started
        <ArrowRight className="h-4 w-4" />
      </Link>
      <Link
        href="/home"
        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border px-6 text-sm font-medium text-foreground transition-colors hover:bg-muted w-full sm:w-auto"
      >
        <Compass className="h-4 w-4" />
        explore
      </Link>
    </div>
  )
}
