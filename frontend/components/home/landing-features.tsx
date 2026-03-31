"use client"

import {
  Video,
  Headphones,
  TrendingUp,
  Users,
} from "lucide-react"
import { useScrollReveal } from "@/hooks/use-scroll-reveal"

const features = [
  {
    icon: Video,
    title: "videos & shorts",
    description:
      "upload, watch, and share videos. scroll through vertical shorts with a full-screen feed.",
  },
  {
    icon: Headphones,
    title: "music",
    description:
      "discover and upload audio tracks. build your library and listen to what the community creates.",
  },
  {
    icon: TrendingUp,
    title: "stocks",
    description:
      "real-time prices across NYSE, Nasdaq, EU, and ECSE. AI-powered sentiment analysis and predictions.",
  },
  {
    icon: Users,
    title: "social",
    description:
      "follow creators, subscribe to channels, like content, and build your profile.",
  },
] as const

export function LandingFeatures() {
  const ref = useScrollReveal()

  return (
    <section ref={ref} className="relative px-4 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-16">
          <h2 data-reveal className="text-3xl sm:text-4xl font-bold tracking-tight">
            built for everything you do
          </h2>
          <p data-reveal data-reveal-delay="1" className="mt-3 text-muted-foreground text-lg">
            one account, four worlds.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              data-reveal
              data-reveal-delay={i + 1}
              className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 sm:p-8 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="relative">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/10 transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground group-hover:ring-primary/20">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
