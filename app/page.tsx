import {
  LandingHero,
  LandingFeatures,
  LandingStocks,
  LandingS2Plus,
  LandingFooterCTA,
} from "@/components/home"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <LandingHero />
      <LandingFeatures />
      <LandingStocks />
      <LandingS2Plus />
      <LandingFooterCTA />
    </main>
  )
}
