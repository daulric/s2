"use client"

import { useCallback, useEffect } from "react"
import { Card, CardContent } from "./ui/card"
import { Button } from "./ui/button"
import { Slider } from "./ui/slider"
import { Play, Pause, Music, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useSignal } from "@preact/signals-react/runtime"

export type MusicTrack = {
  id: string
  title: string
  artist: string
  color: string
  src: string
  audioPath?: string
  thumbnail?: string
  listens?: number
  creatorId?: string
  avatarUrl?: string
}

type MusicTileProps = {
  track: MusicTrack
  isPlaying: boolean
  isActive: boolean
  isLoading?: boolean
  onPlay: (track: MusicTrack) => void
  onPause: () => void
  progress: number
  currentTime: string
  duration: string
  onSeek?: (value: number) => void
  beatIntensity?: number
}

export function MusicTile({
  track,
  isPlaying,
  isActive,
  isLoading,
  onPlay,
  onPause,
  progress,
  currentTime,
  duration,
  onSeek,
  beatIntensity = 0,
}: MusicTileProps) {
  const tick = useSignal(0)

  useEffect(() => {
    if (!isActive || !isPlaying) return
    let raf: number
    const loop = () => { tick.value++; raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [isActive, isPlaying, tick])

  const handleClick = useCallback(() => {
    if (isLoading) return
    if (isActive && isPlaying) {
      onPause()
    } else {
      onPlay(track)
    }
  }, [isActive, isPlaying, isLoading, onPause, onPlay, track])

  return (
    <Card
      className={cn(
        "overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]",
        isActive && "ring-2 ring-primary"
      )}
      onClick={handleClick}
    >
      <div
        className="relative h-40 flex items-center justify-center overflow-hidden"
        style={{ backgroundColor: track.color }}
      >
        {track.thumbnail && track.thumbnail !== "/placeholder.png" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={track.thumbnail} alt={track.title} className="absolute inset-0 w-full h-full object-cover" />
        ) : null}
        {isLoading ? (
          <Loader2 className="h-16 w-16 text-white/60 animate-spin relative z-10" />
        ) : !track.thumbnail || track.thumbnail === "/placeholder.png" ? (
          <Music className="h-16 w-16 text-white/40" />
        ) : null}
        <div className={cn(
          "absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity z-10",
          isLoading ? "opacity-100" : "opacity-0 hover:opacity-100"
        )}>
          <Button
            size="icon"
            variant="secondary"
            className="rounded-full h-14 w-14 shadow-lg"
            disabled={isLoading}
            onClick={(e) => {
              e.stopPropagation()
              handleClick()
            }}
          >
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : isActive && isPlaying ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="h-6 w-6 ml-0.5" />
            )}
          </Button>
        </div>

        {isActive && isPlaying && (() => {
          const barCount = 48
          const bars: number[] = []
          for (let i = 0; i < barCount; i++) {
            const norm = i / (barCount - 1)
            const center = Math.abs(norm - 0.5) * 2
            const envelope = 1 - center * center

            const p1 = Math.sin(tick.value * 0.08 + i * 0.75) * 0.5
            const p2 = Math.sin(tick.value * 0.055 + i * 1.3) * 0.3
            const idle = (1 - beatIntensity) * 0.06 * (Math.abs(p1) + Math.abs(p2))

            const beatPhase = Math.abs(Math.sin(i * 0.5 + tick.value * 0.04))
            const beat = beatIntensity * beatIntensity * 0.9 * beatPhase

            const h = (0.04 + beat + idle) * envelope
            bars.push(Math.max(0.03, Math.min(1, h)))
          }

          return (
            <div
              className="absolute inset-x-0 bottom-0 top-0 flex items-center justify-center pointer-events-none z-20"
              style={{ padding: "0 6%" }}
            >
              <div className="flex items-center w-full h-full gap-[1.5px]">
                {bars.map((h, i) => (
                  <span
                    key={i}
                    className="flex-1 rounded-full backdrop-blur-sm"
                    style={{
                      height: `${h * 80}%`,
                      background: "rgba(255, 255, 255, 0.7)",
                      
                    }}
                  />
                ))}
              </div>
            </div>
          )
        })()}

        {isActive && (
          <div className="absolute bottom-0 left-0 right-0 px-3 pb-2 z-30">
            <div className="flex items-center gap-2">
              <Slider
                value={[progress]}
                max={100}
                step={0.1}
                className="flex-1 [&_[data-slot=slider-track]]:h-1 [&_[data-slot=slider-thumb]]:h-3 [&_[data-slot=slider-thumb]]:w-3"
                onValueChange={(v) => onSeek?.(v[0])}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}
      </div>

      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          {track.creatorId && track.avatarUrl && (
            <Link
              href={`/user/${track.creatorId}`}
              onClick={(e) => e.stopPropagation()}
              className="shrink-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={track.avatarUrl}
                alt={track.artist}
                className="w-8 h-8 rounded-full object-cover hover:ring-2 hover:ring-primary transition-all"
              />
            </Link>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-sm truncate">{track.title}</h3>
            <p className="text-xs text-muted-foreground truncate">
              {track.creatorId ? (
                <Link
                  href={`/user/${track.creatorId}`}
                  onClick={(e) => e.stopPropagation()}
                  className="hover:underline"
                >
                  {track.artist}
                </Link>
              ) : track.artist}
              {track.listens != null && ` · ${track.listens.toLocaleString()} listens`}
            </p>
          </div>
          {isActive && (
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] tabular-nums text-muted-foreground">
                {currentTime} / {duration}
              </span>
              {isPlaying && (
                <div className="flex items-end gap-[2px] h-3">
                  <span className="w-[3px] bg-primary rounded-full animate-[bar-bounce_0.8s_ease-in-out_infinite]" style={{ height: "60%" }} />
                  <span className="w-[3px] bg-primary rounded-full animate-[bar-bounce_0.8s_ease-in-out_0.2s_infinite]" style={{ height: "100%" }} />
                  <span className="w-[3px] bg-primary rounded-full animate-[bar-bounce_0.8s_ease-in-out_0.4s_infinite]" style={{ height: "40%" }} />
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
