"use client"

import { useEffect } from "react"
import { useAuth } from "@/context/AuthProvider"
import { useSubscription } from "@/context/SubscriptionProvider"
import {
  useTransportationFeed,
  type TransportationFilter,
} from "@/hooks/use-transportation-feed"
import { TransportationMap } from "@/components/transportation"
import { Lock, Zap, type LucideIcon } from "lucide-react"
import Link from "next/link"

function GatedContent() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center">
      <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-muted">
        <Lock className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold">s2+ required</h2>
      <p className="text-muted-foreground max-w-md">
        real-time transportation tracking is available for s2+ subscribers.
        upgrade to track vessels and airplanes worldwide.
      </p>
      <Link
        href="/pricing"
        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <Zap className="h-3.5 w-3.5" />
        upgrade to s2+
      </Link>
    </div>
  )
}

export function TransportationSubPage({
  title,
  description,
  filter,
  icon: Icon,
}: {
  title: string
  description: string
  filter: TransportationFilter
  icon: LucideIcon
}) {
  const { user: { user, profile } } = useAuth()
  const { subscribed } = useSubscription()
  const { vehicles, setFilter } = useTransportationFeed()

  useEffect(() => {
    setFilter(filter)
  }, [filter, setFilter])

  const filtered = filter === "all"
    ? vehicles
    : vehicles.filter((v) =>
        filter === "vessels" ? v.kind === "vessel" : v.kind === "airplane",
      )

  const isAdmin = profile?.role === "admin"
  const hasAccess = subscribed || isAdmin

  if (user && !hasAccess) {
    return (
      <div className="p-4">
        <GatedContent />
      </div>
    )
  }

  return (
    <>
      <div className="p-4 pb-0">
        <div className="max-w-screen-2xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Icon className="h-6 w-6 text-muted-foreground" />
                {title}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {description}
              </p>
            </div>
            <div className="text-sm text-muted-foreground font-medium">
              {filtered.length} active
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="max-w-screen-2xl mx-auto">
          <TransportationMap
            vehicles={filtered}
            className="h-[calc(100vh-180px)] min-h-[400px]"
          />
        </div>
      </div>
    </>
  )
}
