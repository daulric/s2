"use client"

import { Ship } from "lucide-react"
import { TransportationSubPage } from "../_shared"

export default function VesselsPage() {
  return (
    <TransportationSubPage
      title="vessels"
      description="real-time ship and maritime vessel tracking via AIS"
      filter="vessels"
      icon={Ship}
    />
  )
}
