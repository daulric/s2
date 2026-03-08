"use client"

import { useCallback } from "react"
import { Card, CardContent } from "./ui/card"
import { Button } from "./ui/button"
import { Slider } from "./ui/slider"
import { Play, Pause, Music, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export type MusicTrack = {
  id: string
  title: string
  artist: string
  color: string
  src: string
  thumbnail?: string
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
}: MusicTileProps) {
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
          "absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity",
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

        {isActive && (
          <div className="absolute bottom-0 left-0 right-0 px-3 pb-2">
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
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-sm truncate">{track.title}</h3>
            <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
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
