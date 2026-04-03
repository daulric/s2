"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/context/AuthProvider"
import { useSubscription } from "@/context/SubscriptionProvider"
import { backendFetch } from "@/lib/backend-fetch"
import { GrenadaElectionMap } from "@/components/census/grenada-election-map"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Lock, Zap, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import Link from "next/link"

function GatedContent() {
  return (
    <div className="flex flex-col items-center justify-center h-[80vh] gap-4 text-center">
      <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-muted">
        <Lock className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold">s2+ required</h2>
      <p className="text-muted-foreground max-w-md">
        election data and maps are available for s2+ subscribers.
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

export default function GrenadaCensusPage() {
  const { user: { user, profile } } = useAuth()
  const { subscribed } = useSubscription()
  const isAdmin = profile?.role === "admin"
  const hasAccess = subscribed || isAdmin

  const [years, setYears] = useState<number[]>([])
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [constituencyData, setConstituencyData] = useState<unknown>(null)
  const [generalData, setGeneralData] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(false)

  useEffect(() => {
    if (!hasAccess) { setLoading(false); return }

    backendFetch("/census/grenada/available-years")
      .then((r) => r.json())
      .then((data) => {
        const yrs = (data as number[]).sort((a, b) => b - a)
        setYears(yrs)
        if (yrs.length > 0) setSelectedYear(yrs[0])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [hasAccess])

  const fetchElectionData = useCallback(async (year: number) => {
    setDataLoading(true)
    setConstituencyData(null)
    setGeneralData(null)
    try {
      const genRes = await backendFetch(`/census/grenada/election-results/general/${year}`)
      if (genRes.ok) setGeneralData(await genRes.json())

      if (year >= 2022) {
        const constRes = await backendFetch(`/census/grenada/election-results/constituency/${year}`)
        if (constRes.ok) setConstituencyData(await constRes.json())
      }
    } catch {
      // ignore
    } finally {
      setDataLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedYear) fetchElectionData(selectedYear)
  }, [selectedYear, fetchElectionData])

  if (!user) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <p className="text-muted-foreground">sign in to view election data</p>
      </div>
    )
  }

  if (!hasAccess) return <GatedContent />

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const currentIdx = years.indexOf(selectedYear ?? -1)
  const canPrev = currentIdx < years.length - 1
  const canNext = currentIdx > 0

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">Grenada Elections</h1>
          <Badge variant="outline" className="text-xs">
            {years.length} elections
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={!canPrev || dataLoading}
            onClick={() => canPrev && setSelectedYear(years[currentIdx + 1])}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[3rem] text-center">
            {dataLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mx-auto" /> : selectedYear}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={!canNext || dataLoading}
            onClick={() => canNext && setSelectedYear(years[currentIdx - 1])}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 relative">
        <GrenadaElectionMap
          constituencyData={constituencyData as Parameters<typeof GrenadaElectionMap>[0]["constituencyData"]}
          generalData={generalData as Parameters<typeof GrenadaElectionMap>[0]["generalData"]}
          year={selectedYear ?? 2022}
          className="h-full"
        />
      </div>
    </div>
  )
}
