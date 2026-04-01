import { Metadata } from "next"
import AirlinesPage from "./page_client"

export const metadata: Metadata = {
  title: "s2 - Airlines",
  description: "Real-time flight and aircraft tracking via ADS-B",
}

export default function PAGE() {
  return <AirlinesPage />
}
