"use client"

import Link from "next/link"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
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
    <div className="space-y-4">
      <Button className="w-full" size="lg" onClick={() => router.push("/auth")}>
        <Link href="/auth" prefetch>
          get started
        </Link>
      </Button>
      <Button variant="outline" className="w-full" size="lg" onClick={() => router.push("/home")}>
        <Link href="/home" prefetch>
          browse as guest
        </Link>
      </Button>
    </div>
  )
}
