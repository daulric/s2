"use client"

import Link from "next/link"
import { useMemo } from "react"
import { ChevronRight, Ship, Plane } from "lucide-react"
import { useTransportationFeed } from "@/hooks/use-transportation-feed"
import { TransportationMap } from "./transportation-map"

export function TransportationHomeWidget() {
  const { vehicles } = useTransportationFeed()

  const vesselVehicles = useMemo(
    () => vehicles.filter((v) => v.kind === "vessel"),
    [vehicles],
  )
  const airplaneVehicles = useMemo(
    () => vehicles.filter((v) => v.kind === "airplane"),
    [vehicles],
  )

  return (
    <>
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Ship className="h-4 w-4 text-blue-400" />
            live vessels
            <span className="text-xs font-normal text-muted-foreground">
              {vesselVehicles.length} active
            </span>
          </h2>
          <Link
            href="/transportation/vessels"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5"
          >
            full map
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <TransportationMap vehicles={vesselVehicles} className="h-[300px]" compact />
      </section>

      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Plane className="h-4 w-4 text-amber-400" />
            live airlines
            <span className="text-xs font-normal text-muted-foreground">
              {airplaneVehicles.length} active
            </span>
          </h2>
          <Link
            href="/transportation/airlines"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5"
          >
            full map
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <TransportationMap vehicles={airplaneVehicles} className="h-[300px]" compact />
      </section>
    </>
  )
}
