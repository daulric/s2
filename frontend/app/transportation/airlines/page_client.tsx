"use client"

import { Plane } from "lucide-react"
import { TransportationSubPage } from "../_shared"

export default function AirlinesPage() {
  return (
    <TransportationSubPage
      title="airlines"
      description="real-time flight and aircraft tracking via ADS-B"
      filter="airplanes"
      icon={Plane}
    />
  )
}
