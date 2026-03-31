"use client"

import {
  BarChart3,
  Globe,
  Wifi,
  Brain,
  Newspaper,
  Star,
} from "lucide-react"
import { useScrollReveal } from "@/hooks/use-scroll-reveal"

const stats = [
  { icon: Globe, label: "4 exchanges", detail: "NYSE, Nasdaq, EU, ECSE" },
  { icon: Wifi, label: "live prices", detail: "real-time WebSocket feeds" },
  { icon: Brain, label: "AI predictions", detail: "sentiment-driven scores" },
  { icon: Newspaper, label: "news analysis", detail: "multi-source articles" },
  { icon: BarChart3, label: "OHLCV charts", detail: "1D to ALL-time ranges" },
  { icon: Star, label: "watchlists", detail: "track your favorites" },
] as const

export function LandingStocks() {
  const ref = useScrollReveal()

  return (
    <section ref={ref} className="relative px-4 py-24 overflow-hidden">
      <div className="mx-auto max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
          <div>
            <span data-reveal className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary mb-4">
              <BarChart3 className="h-3 w-3" />
              stock intelligence
            </span>
            <h2 data-reveal data-reveal-delay="1" className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              smarter market insights
            </h2>
            <p data-reveal data-reveal-delay="2" className="text-muted-foreground leading-relaxed mb-3">
              track stocks across four exchanges with real-time price feeds powered by Finnhub WebSockets. every ticker gets news articles analyzed for sentiment — bullish, bearish, or neutral.
            </p>
            <p data-reveal data-reveal-delay="3" className="text-muted-foreground leading-relaxed">
              our prediction engine aggregates confidence-weighted sentiment scores to surface directional signals, so you can focus on what matters.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {stats.map((stat, i) => (
              <div
                key={stat.label}
                data-reveal
                data-reveal-delay={Math.min(i + 1, 5)}
                className="group rounded-xl border border-border bg-card p-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
              >
                <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/10 transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                  <stat.icon className="h-4 w-4" />
                </div>
                <p className="text-sm font-semibold">{stat.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
