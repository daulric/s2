import { Metadata } from "next"
import PricingPage from "./page_client"

export const metadata: Metadata = {
  title: "s2 - Pricing",
  description: "Upgrade to s2+ for ad-free playback, live global stock data, high-quality audio, and more",
}

export default function PAGE() {
  return <PricingPage />
}
