"use client"

import { HomeLandingClient } from "./home-landing-client"
import { Separator } from "@/components/ui/separator"
import { useScrollReveal } from "@/hooks/use-scroll-reveal"

export function LandingFooterCTA() {
  const ref = useScrollReveal()

  return (
    <section ref={ref} className="relative px-4 pt-12 pb-24">
      <Separator className="mb-16 max-w-xs mx-auto opacity-50" />

      <div className="mx-auto max-w-md text-center">
        <h2 data-reveal className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
          ready to get started?
        </h2>
        <p data-reveal data-reveal-delay="1" className="text-muted-foreground mb-8">
          join s2 and explore everything the platform has to offer.
        </p>
        <div data-reveal data-reveal-delay="2">
          <HomeLandingClient />
        </div>
      </div>
    </section>
  )
}
