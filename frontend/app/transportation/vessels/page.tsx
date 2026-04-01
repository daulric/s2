import { Metadata } from "next"
import VesselsPage from "./page_client"

export const metadata: Metadata = {
  title: "s2 - Vessels",
  description: "Real-time vessel and ship tracking via AIS",
}

export default function PAGE() {
  return <VesselsPage />
}
