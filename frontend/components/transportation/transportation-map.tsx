"use client"

import { useMemo, useCallback, useEffect, useRef } from "react"
import { useSignal, useSignals } from "@preact/signals-react/runtime"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Map,
  MapClusterLayer,
  MapPopup,
  MapControls,
  useMap,
} from "@/components/ui/map"
import type { Vehicle } from "@/hooks/use-transportation-feed"
import { cn } from "@/lib/utils"
import {
  Ship,
  Plane,
  Compass,
  Gauge,
  Route,
  ArrowRight,
  Flag,
  Tag,
  Ruler,
  Radio,
  Mountain,
  Building2,
} from "lucide-react"

type TransportationMapProps = {
  vehicles: Vehicle[]
  className?: string
  compact?: boolean
}

type SelectedPoint = {
  vehicle: Vehicle
  coordinates: [number, number]
}

function toGeoJSON(
  vehicles: Vehicle[],
): GeoJSON.FeatureCollection<GeoJSON.Point, Vehicle> {
  return {
    type: "FeatureCollection",
    features: vehicles.map((v) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [v.lng, v.lat] },
      properties: v,
    })),
  }
}

const GLOBE_ZOOM_THRESHOLD = 3

function AdaptiveProjection() {
  const { map, isLoaded } = useMap()
  const isGlobe = useRef(true)

  useEffect(() => {
    if (!map || !isLoaded) return

    const safeSetProjection = (proj: { type: string }) => {
      try {
        if (map.isStyleLoaded()) map.setProjection(proj)
      } catch {
        // style internals not ready
      }
    }

    const update = () => {
      const shouldBeGlobe = map.getZoom() < GLOBE_ZOOM_THRESHOLD
      if (shouldBeGlobe !== isGlobe.current) {
        isGlobe.current = shouldBeGlobe
        safeSetProjection(shouldBeGlobe ? { type: "globe" } : { type: "mercator" })
      }
    }

    map.on("zoomend", update)
    return () => { map.off("zoomend", update) }
  }, [map, isLoaded])

  return null
}

function parseTrail(raw: unknown): Vehicle["trail"] {
  if (Array.isArray(raw)) return raw
  if (typeof raw === "string") {
    try { return JSON.parse(raw) } catch { return [] }
  }
  return []
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number | undefined
}) {
  if (value === undefined || value === "") return null
  return (
    <div className="flex items-start gap-2 text-xs">
      <Icon className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
      <div>
        <span className="text-muted-foreground">{label}</span>
        <span className="ml-1.5 text-foreground font-medium">{value}</span>
      </div>
    </div>
  )
}

function VehiclePopupContent({ vehicle }: { vehicle: Vehicle }) {
  const hasRoute = vehicle.origin || vehicle.destination
  const isVessel = vehicle.kind === "vessel"

  const dimensions =
    vehicle.lengthM && vehicle.widthM
      ? `${vehicle.lengthM}m × ${vehicle.widthM}m`
      : vehicle.lengthM
        ? `${vehicle.lengthM}m`
        : undefined

  return (
    <div className="min-w-[220px] max-w-[280px]">
      <div className="flex items-center gap-2 mb-2">
        <div
          className={cn(
            "flex items-center justify-center rounded-full h-7 w-7",
            isVessel ? "bg-blue-500/20" : "bg-amber-500/20",
          )}
        >
          {isVessel ? (
            <Ship className="h-4 w-4 text-blue-400" />
          ) : (
            <Plane className="h-4 w-4 text-amber-400" />
          )}
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-sm leading-tight truncate">
            {vehicle.flag && <span className="mr-1">{vehicle.flag}</span>}
            {vehicle.name}
          </div>
          {vehicle.type && (
            <div className="text-[11px] text-muted-foreground leading-tight truncate">
              {vehicle.type}
            </div>
          )}
        </div>
      </div>

      {hasRoute && (
        <div className="flex items-center gap-1.5 mb-2 rounded-md bg-muted/50 px-2 py-1.5 text-xs font-medium">
          <Route className="h-3 w-3 shrink-0 text-muted-foreground" />
          <span className="truncate">{vehicle.origin ?? "?"}</span>
          <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
          <span className="truncate">{vehicle.destination ?? "?"}</span>
        </div>
      )}

      <div className="space-y-1.5">
        <InfoRow icon={Compass} label="Position" value={`${vehicle.lat.toFixed(4)}, ${vehicle.lng.toFixed(4)}`} />
        <InfoRow
          icon={Gauge}
          label="Speed / Heading"
          value={`${vehicle.speed.toFixed(1)} kn · ${vehicle.heading.toFixed(0)}°`}
        />
        {vehicle.altitude !== undefined && (
          <InfoRow icon={Mountain} label="Altitude" value={`${vehicle.altitude.toLocaleString()} ft`} />
        )}
        <InfoRow icon={Radio} label="Callsign" value={vehicle.callsign} />
        {isVessel && <InfoRow icon={Tag} label="IMO" value={vehicle.imo} />}
        {isVessel && <InfoRow icon={Ruler} label="Dimensions" value={dimensions} />}
        {!isVessel && <InfoRow icon={Tag} label="Registration" value={vehicle.registration} />}
        {!isVessel && <InfoRow icon={Building2} label="Operator" value={vehicle.operator} />}
        {isVessel && <InfoRow icon={Flag} label="MMSI" value={vehicle.id.replace("v-", "")} />}
      </div>
    </div>
  )
}


const NAV_ITEMS = [
  { href: "/transportation/vessels", label: "vessels", color: "bg-blue-500" },
  { href: "/transportation/airlines", label: "airplanes", color: "bg-amber-500" },
] as const

function MapNavBar({ vehicles }: { vehicles: Vehicle[] }) {
  const pathname = usePathname()

  return (
    <div className="absolute bottom-3 left-3 z-[1000] flex items-center gap-1 rounded-lg bg-card/80 backdrop-blur-sm border border-border p-1 text-xs">
      {NAV_ITEMS.map(({ href, label, color }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1 transition-colors",
              active
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <span className={cn("h-2 w-2 rounded-full", color)} />
            {label}
          </Link>
        )
      })}
      <span className="px-2 font-medium text-foreground tabular-nums">
        {vehicles.length} active
      </span>
    </div>
  )
}

export function TransportationMap({
  vehicles,
  className,
  compact,
}: TransportationMapProps) {
  useSignals()
  const selected = useSignal<SelectedPoint | null>(null)

  const geojson = useMemo(() => toGeoJSON(vehicles), [vehicles])

  const handlePointClick = useCallback(
    (
      feature: GeoJSON.Feature<GeoJSON.Point, Vehicle>,
      coordinates: [number, number],
    ) => {
      selected.value = { vehicle: feature.properties, coordinates }
    },
    [selected],
  )

  const handlePopupClose = useCallback(() => {
    selected.value = null
  }, [selected])

  return (
    <div
      className={cn("relative w-full", className)}
    >
      <div className="h-full w-full overflow-hidden rounded-xl">
        <Map center={[0, 20]} zoom={compact ? 1 : 1.8} projection={{ type: "globe" }}>
          <AdaptiveProjection />
          {!compact && (
            <MapControls
              position="top-right"
              showZoom
              showCompass
              showFullscreen
            />
          )}

          <MapClusterLayer<Vehicle>
            data={geojson}
            clusterRadius={60}
            clusterMaxZoom={12}
            clusterColors={["#3b82f6", "#eab308", "#ef4444"]}
            clusterThresholds={[500, 5000]}
            pointColor="#3b82f6"
            onPointClick={handlePointClick}
          />

          {selected.value && (
            <MapPopup
              longitude={selected.value.coordinates[0]}
              latitude={selected.value.coordinates[1]}
              onClose={handlePopupClose}
              closeButton
            >
              <VehiclePopupContent vehicle={selected.value.vehicle} />
            </MapPopup>
          )}
        </Map>
      </div>
      {!compact && <MapNavBar vehicles={vehicles} />}
    </div>
  )
}
