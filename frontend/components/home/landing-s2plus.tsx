"use client"

import Link from "next/link"
import {
  Zap,
  Shield,
  Globe,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useScrollReveal } from "@/hooks/use-scroll-reveal"

const perks = [
  { icon: Globe, label: "global tracking", description: "real-time vessel and aircraft tracking worldwide" },
  { icon: Shield, label: "priority access", description: "early access to new features and updates" },
  { icon: Sparkles, label: "premium media", description: "ad-free playback and high-quality audio streaming" },
] as const

export function LandingS2Plus() {
  const ref = useScrollReveal()

  return (
    <section ref={ref} className="relative px-4 py-24 overflow-hidden">
      <div className="relative mx-auto max-w-3xl text-center">
        <div data-reveal className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
          <Zap className="h-3 w-3 fill-primary" />
          s2+
        </div>

        <h2 data-reveal data-reveal-delay="1" className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
          unlock more with s2+
        </h2>

        <p data-reveal data-reveal-delay="2" className="text-muted-foreground text-lg mb-12 max-w-lg mx-auto">
          $5/month for premium features, real-time transportation tracking, and ad-free media.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {perks.map((perk, i) => (
            <div
              key={perk.label}
              data-reveal
              data-reveal-delay={i + 2}
              className="group overflow-hidden rounded-xl border border-border bg-card p-5 text-center transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
            >
              <div className="mx-auto mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/10 transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                <perk.icon className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold mb-1">{perk.label}</p>
              <p className="text-xs text-muted-foreground">{perk.description}</p>
            </div>
          ))}
        </div>

        <div data-reveal data-reveal-delay="5">
          <Link href="/pricing">
            <Button size="lg" className="gap-2">
              <Zap className="h-4 w-4" />
              view pricing
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
