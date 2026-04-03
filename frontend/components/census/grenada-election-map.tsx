"use client"

import { useEffect, useRef, useState, useMemo, useCallback } from "react"
import { Map as MapGL, useMap } from "@/components/ui/map"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

type Candidate = {
  candidate: string
  party: string
  votes: number
  percentage: number
}

type Constituency = {
  constituency: string
  electorate: number
  turnout: number
  turnout_pct: number
  total_votes: number
  winner: { candidate: string; party: string; votes: number }
  candidates: Candidate[]
}

type ConstituencyData = {
  election: string
  year: number
  constituencies: Constituency[]
}

type GeneralResult = {
  party: string
  votes: number
  percentage: number
  seats: number
  change: string
}

type GeneralData = {
  election: string
  year: number
  results: GeneralResult[]
}

const PARTY_COLORS: Record<string, string> = {
  "National Democratic Congress": "#eab308",
  "New National Party": "#22c55e",
  "Grenada United Labour Party": "#ef4444",
  "Independent Freedom Party": "#a855f7",
  "Grenada Renaissance Party": "#3b82f6",
  "Independents": "#6b7280",
  "Independent": "#6b7280",
}

const CONSTITUENCY_TO_PARISH: Record<string, string> = {
  "Carriacou and Petite Martinique": "Southern Grenadine Islands",
  "St. Andrew North East": "Saint Andrew",
  "St. Andrew North West": "Saint Andrew",
  "St. Andrew South East": "Saint Andrew",
  "St. Andrew South West": "Saint Andrew",
  "St. David": "Saint David",
  "St. George North East": "Saint George",
  "St. George North West": "Saint George",
  "St. George South": "Saint George",
  "St. George South East": "Saint George",
  "Town of St. George": "Saint George",
  "St. John": "Saint John",
  "St. Mark": "Saint Mark",
  "St. Patrick East": "Saint Patrick",
  "St. Patrick West": "Saint Patrick",
}

function getPartyColor(party: string): string {
  return PARTY_COLORS[party] ?? "#a0aec0"
}

function aggregateByParish(constituencies: Constituency[]) {
  const parishes = new Map<string, { totalVotes: number; partyVotes: Map<string, number>; constituencies: Constituency[] }>()

  for (const c of constituencies) {
    const parish = CONSTITUENCY_TO_PARISH[c.constituency] ?? c.constituency
    if (!parishes.has(parish)) {
      parishes.set(parish, { totalVotes: 0, partyVotes: new Map(), constituencies: [] })
    }
    const p = parishes.get(parish)!
    p.totalVotes += c.total_votes
    p.constituencies.push(c)
    for (const cand of c.candidates) {
      p.partyVotes.set(cand.party, (p.partyVotes.get(cand.party) ?? 0) + cand.votes)
    }
  }

  const result = new Map<string, { winningParty: string; totalVotes: number; partyVotes: Map<string, number>; constituencies: Constituency[] }>()
  for (const [parish, data] of parishes) {
    let maxVotes = 0
    let winningParty = ""
    for (const [party, votes] of data.partyVotes) {
      if (votes > maxVotes) {
        maxVotes = votes
        winningParty = party
      }
    }
    result.set(parish, { winningParty, ...data })
  }
  return result
}

function ParishLayer({ parishData }: { parishData: ReturnType<typeof aggregateByParish> }) {
  const { map, isLoaded } = useMap()
  const layerAdded = useRef(false)

  useEffect(() => {
    if (!map || !isLoaded || layerAdded.current) return

    fetch("/geo/grenada-parishes.geojson")
      .then((r) => r.json())
      .then((geojson) => {
        if (!map || layerAdded.current) return
        layerAdded.current = true

        for (const feature of geojson.features) {
          const name = feature.properties.shapeName as string
          const data = parishData.get(name)
          const color = data ? getPartyColor(data.winningParty) : "#a0aec0"
          feature.properties._fillColor = color
          feature.properties._parishName = name
          feature.properties._winningParty = data?.winningParty ?? "N/A"
        }

        map.addSource("parishes", { type: "geojson", data: geojson })

        const firstLabel = map.getStyle().layers.find((l: { type: string }) => l.type === "symbol")?.id

        map.addLayer({
          id: "parish-fill",
          type: "fill",
          source: "parishes",
          paint: {
            "fill-color": ["get", "_fillColor"],
            "fill-opacity": 0.6,
          },
        }, firstLabel)

        map.addLayer({
          id: "parish-outline",
          type: "line",
          source: "parishes",
          paint: {
            "line-color": "#1a202c",
            "line-width": 1.5,
          },
        }, firstLabel)

        map.addLayer({
          id: "parish-hover",
          type: "fill",
          source: "parishes",
          paint: {
            "fill-color": "#ffffff",
            "fill-opacity": [
              "case",
              ["boolean", ["feature-state", "hover"], false],
              0.2,
              0,
            ],
          },
        }, firstLabel)

        let hoveredId: string | number | null = null

        map.on("mousemove", "parish-fill", (e) => {
          if (e.features?.length) {
            map.getCanvas().style.cursor = "pointer"
            const id = e.features[0].id
            if (hoveredId !== null && hoveredId !== id) {
              map.setFeatureState({ source: "parishes", id: hoveredId }, { hover: false })
            }
            hoveredId = id ?? null
            if (hoveredId !== null) {
              map.setFeatureState({ source: "parishes", id: hoveredId }, { hover: true })
            }
          }
        })

        map.on("mouseleave", "parish-fill", () => {
          map.getCanvas().style.cursor = ""
          if (hoveredId !== null) {
            map.setFeatureState({ source: "parishes", id: hoveredId }, { hover: false })
            hoveredId = null
          }
        })
      })

    return () => {
      if (map && layerAdded.current) {
        try {
          map.removeLayer("parish-hover")
          map.removeLayer("parish-outline")
          map.removeLayer("parish-fill")
          map.removeSource("parishes")
        } catch { /* already removed */ }
        layerAdded.current = false
      }
    }
  }, [map, isLoaded, parishData])

  return null
}

function ParishPopup({
  parishData,
  onSelect,
}: {
  parishData: ReturnType<typeof aggregateByParish>
  onSelect: (parish: string | null) => void
}) {
  const { map, isLoaded } = useMap()

  useEffect(() => {
    if (!map || !isLoaded) return

    const handler = (e: unknown) => {
      const evt = e as { features?: { properties?: Record<string, string> }[] }
      if (evt.features?.length) {
        const name = evt.features[0].properties?._parishName
        if (name) onSelect(name)
      }
    }

    map.on("click", "parish-fill", handler as never)
    return () => {
      map.off("click", "parish-fill", handler as never)
    }
  }, [map, isLoaded, onSelect, parishData])

  return null
}

function SelectedParishPanel({
  parish,
  parishData,
  onClose,
}: {
  parish: string
  parishData: ReturnType<typeof aggregateByParish>
  onClose: () => void
}) {
  const data = parishData.get(parish)
  if (!data) return null

  const sorted = [...data.partyVotes.entries()].sort((a, b) => b[1] - a[1])

  return (
    <div className="absolute top-3 right-3 z-10 w-80 max-h-[80vh] overflow-y-auto rounded-xl border bg-card/95 backdrop-blur-sm shadow-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">{parish}</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xs">
          ✕
        </button>
      </div>

      <div className="space-y-2 mb-4">
        {sorted.map(([party, votes]) => {
          const pct = ((votes / data.totalVotes) * 100).toFixed(1)
          return (
            <div key={party}>
              <div className="flex items-center justify-between text-xs mb-0.5">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: getPartyColor(party) }} />
                  <span className="font-medium truncate max-w-[160px]">{party}</span>
                </div>
                <span className="text-muted-foreground">{pct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: getPartyColor(party) }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="border-t pt-3 space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Constituencies</h4>
        {data.constituencies.map((c) => (
          <div key={c.constituency} className="text-xs border rounded-lg p-2">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium">{c.constituency}</span>
              <Badge variant="outline" className="text-[10px] px-1.5" style={{ borderColor: getPartyColor(c.winner.party), color: getPartyColor(c.winner.party) }}>
                {c.winner.party.split(" ").map(w => w[0]).join("")}
              </Badge>
            </div>
            <div className="text-muted-foreground">
              Winner: {c.winner.candidate} ({c.winner.votes.toLocaleString()} votes)
            </div>
            <div className="text-muted-foreground">
              Turnout: {c.turnout_pct}%
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function GeneralResultsBar({ general }: { general: GeneralData | null }) {
  if (!general) return null

  const topParties = general.results.filter((r) => r.seats > 0 || r.percentage > 1)

  return (
    <div className="absolute bottom-3 left-3 right-3 z-10 rounded-xl border bg-card/95 backdrop-blur-sm shadow-lg p-3">
      <div className="flex items-center gap-3 overflow-x-auto">
        {topParties.map((r) => (
          <div key={r.party} className="flex items-center gap-2 shrink-0">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: getPartyColor(r.party) }} />
            <div className="text-xs">
              <span className="font-semibold">{r.party}</span>
              <span className="text-muted-foreground ml-1">{r.seats} seats · {r.percentage}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function GeneralOnlyPanel({ general }: { general: GeneralData }) {
  const sorted = [...general.results].sort((a, b) => b.votes - a.votes)
  const totalVotes = sorted.reduce((s, r) => s + r.votes, 0)

  return (
    <div className="absolute top-12 right-3 z-10 w-80 max-h-[80vh] overflow-y-auto rounded-xl border bg-card/95 backdrop-blur-sm shadow-lg p-4">
      <h3 className="font-semibold text-sm mb-3">General Results</h3>

      <div className="space-y-2.5 mb-4">
        {sorted.map((r) => {
          const pct = totalVotes > 0 ? ((r.votes / totalVotes) * 100).toFixed(1) : "0"
          return (
            <div key={r.party}>
              <div className="flex items-center justify-between text-xs mb-0.5">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: getPartyColor(r.party) }} />
                  <span className="font-medium truncate max-w-[140px]">{r.party}</span>
                </div>
                <span className="text-muted-foreground">{r.seats} seats · {pct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: getPartyColor(r.party) }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-0.5">
                <span>{r.votes.toLocaleString()} votes</span>
                {r.change !== "0" && <span>change: {r.change}</span>}
              </div>
            </div>
          )
        })}
      </div>

      <div className="border-t pt-2 text-xs text-muted-foreground">
        Total votes: {totalVotes.toLocaleString()}
      </div>
    </div>
  )
}

function GeneralOnlyLayer({ winningParty }: { winningParty: string }) {
  const { map, isLoaded } = useMap()
  const layerAdded = useRef(false)

  useEffect(() => {
    if (!map || !isLoaded || layerAdded.current) return

    fetch("/geo/grenada-parishes.geojson")
      .then((r) => r.json())
      .then((geojson) => {
        if (!map || layerAdded.current) return
        layerAdded.current = true

        const color = getPartyColor(winningParty)
        for (const feature of geojson.features) {
          feature.properties._fillColor = color
        }

        map.addSource("parishes", { type: "geojson", data: geojson })

        const firstLabel = map.getStyle().layers.find((l: { type: string }) => l.type === "symbol")?.id

        map.addLayer({
          id: "parish-fill",
          type: "fill",
          source: "parishes",
          paint: {
            "fill-color": ["get", "_fillColor"],
            "fill-opacity": 0.5,
          },
        }, firstLabel)

        map.addLayer({
          id: "parish-outline",
          type: "line",
          source: "parishes",
          paint: {
            "line-color": "#1a202c",
            "line-width": 1.5,
          },
        }, firstLabel)
      })

    return () => {
      if (map && layerAdded.current) {
        try {
          map.removeLayer("parish-outline")
          map.removeLayer("parish-fill")
          map.removeSource("parishes")
        } catch { /* already removed */ }
        layerAdded.current = false
      }
    }
  }, [map, isLoaded, winningParty])

  return null
}

export function GrenadaElectionMap({
  constituencyData,
  generalData,
  year,
  className,
}: {
  constituencyData: ConstituencyData | null
  generalData: GeneralData | null
  year: number
  className?: string
}) {
  const [selectedParish, setSelectedParish] = useState<string | null>(null)
  const hasConstituencies = !!constituencyData?.constituencies?.length

  const parishData = useMemo(() => {
    if (!constituencyData) return new Map() as ReturnType<typeof aggregateByParish>
    return aggregateByParish(constituencyData.constituencies)
  }, [constituencyData])

  const handleSelect = useCallback((parish: string | null) => {
    setSelectedParish(parish)
  }, [])

  const generalWinner = useMemo(() => {
    if (!generalData) return ""
    const sorted = [...generalData.results].sort((a, b) => b.seats - a.seats || b.votes - a.votes)
    return sorted[0]?.party ?? ""
  }, [generalData])

  const electionTitle = constituencyData?.election ?? generalData?.election ?? `${year} Election`

  return (
    <div className={cn("relative w-full h-full", className)}>
      <div className="h-full w-full overflow-hidden rounded-xl">
        <MapGL
          center={[-61.68, 12.12]}
          zoom={10}
          key={year}
        >
          {hasConstituencies ? (
            <>
              <ParishLayer parishData={parishData} />
              <ParishPopup parishData={parishData} onSelect={handleSelect} />
            </>
          ) : generalWinner ? (
            <GeneralOnlyLayer winningParty={generalWinner} />
          ) : null}
        </MapGL>
      </div>

      {hasConstituencies && selectedParish && (
        <SelectedParishPanel
          parish={selectedParish}
          parishData={parishData}
          onClose={() => setSelectedParish(null)}
        />
      )}

      {!hasConstituencies && generalData && (
        <GeneralOnlyPanel general={generalData} />
      )}

      <GeneralResultsBar general={generalData} />

      <div className="absolute top-3 left-3 z-10">
        <Badge variant="secondary" className="bg-card/90 backdrop-blur-sm border text-xs">
          {electionTitle}
        </Badge>
      </div>
    </div>
  )
}
