"use client"

import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useUsEquitiesMarketPhase } from "@/hooks/use-us-equities-market-open"
import { usMarketPhaseLabel, type UsEquitiesMarketPhase } from "@/lib/stocks/us-market-hours"

const phaseStyles: Record<
  UsEquitiesMarketPhase,
  { border: string; bg: string; text: string; dot: string; pulse: boolean }
> = {
  regular: {
    border: "border-emerald-500/45",
    bg: "bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
    pulse: true,
  },
  pre_market: {
    border: "border-sky-500/45",
    bg: "bg-sky-500/10",
    text: "text-sky-800 dark:text-sky-300",
    dot: "bg-sky-500",
    pulse: true,
  },
  after_hours: {
    border: "border-violet-500/45",
    bg: "bg-violet-500/10",
    text: "text-violet-800 dark:text-violet-300",
    dot: "bg-violet-500",
    pulse: true,
  },
  closed: {
    border: "border-muted-foreground/35",
    bg: "bg-muted/50",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground/55",
    pulse: false,
  },
}

export function UsMarketStatusBadge({ className }: { className?: string }) {
  const phase = useUsEquitiesMarketPhase()
  const s = phaseStyles[phase]
  const label = usMarketPhaseLabel(phase)

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Badge
            variant="outline"
            className={cn(
              "h-6 cursor-default gap-1.5 px-2.5 text-xs font-medium tabular-nums",
              s.border,
              s.bg,
              s.text,
              className,
            )}
          />
        }
      >
        <span
          className={cn("size-1.5 shrink-0 rounded-full", s.dot, s.pulse && "animate-pulse")}
          aria-hidden
        />
        {label}
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        className="max-w-none px-3.5 py-3 text-left text-sm leading-relaxed"
      >
        <div className="flex w-[min(20rem,calc(100vw-2rem))] flex-col gap-3">
          <div>
            <p className="font-semibold">NYSE & Nasdaq</p>
            <p className="mt-0.5 text-xs text-background/70">Eastern Time (ET)</p>
          </div>
          <dl className="space-y-2.5 border-t border-background/15 pt-2.5">
            <div>
              <dt className="text-xs font-medium text-background/65">Regular session</dt>
              <dd className="mt-1 text-background/95">Mon–Fri, 9:30 AM – 4:00 PM</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-background/65">Pre-market</dt>
              <dd className="mt-1 text-background/95">Mon–Fri, 4:00 AM – 9:30 AM</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-background/65">After-hours</dt>
              <dd className="mt-1 text-background/95">Mon–Fri, 4:00 PM – 8:00 PM</dd>
            </div>
          </dl>
          <p className="border-t border-background/15 pt-2.5 text-xs leading-snug text-background/70">
            Closed nights, weekends, and federal market holidays (NYSE-style observed dates).
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
