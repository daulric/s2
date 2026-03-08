"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { MusicTile, type MusicTrack } from "@/components/music-tile"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Loader2,
  Music,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useWebHaptics } from "web-haptics/react"
import { AudioInfoProps } from "@/lib/audios/data-to-audio-format"

const TRACK_COLORS = [
  "#6366f1", "#0ea5e9", "#f97316", "#22c55e",
  "#ec4899", "#64748b", "#a855f7", "#eab308",
  "#14b8a6", "#f43f5e", "#8b5cf6", "#06b6d4",
]

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00"
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

type HapticEvent = {
  time: number
  pattern: { duration: number; delay?: number; intensity?: number }[]
}

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

async function analyzeAudio(src: string): Promise<{ timeline: HapticEvent[]; duration: number }> {
  const response = await fetch(src)
  const arrayBuffer = await response.arrayBuffer()

  const offlineCtx = new OfflineAudioContext(2, 1, 44100)
  const decoded = await offlineCtx.decodeAudioData(arrayBuffer)

  const sampleRate = decoded.sampleRate
  const channelData = decoded.getChannelData(0)
  const totalSamples = channelData.length

  const hopSize = Math.floor(sampleRate * 0.01)
  const fftSize = 512
  const binFreq = sampleRate / fftSize
  const bassEnd = Math.floor(250 / binFreq)
  const midEnd = Math.floor(2000 / binFreq)
  const trebleEnd = Math.min(Math.floor(8000 / binFreq), fftSize / 2)

  const timeline: HapticEvent[] = []
  let lastEventTime = -Infinity
  const MIN_GAP = 0.08

  let prevBass = 0
  let prevMid = 0
  let prevTreble = 0

  const re = new Float32Array(fftSize)
  const im = new Float32Array(fftSize)
  const magnitudes = new Float32Array(fftSize / 2)
  let frameCount = 0

  for (let offset = 0; offset + fftSize <= totalSamples; offset += hopSize) {
    const time = offset / sampleRate

    for (let i = 0; i < fftSize; i++) {
      const windowCoeff = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (fftSize - 1))
      re[i] = channelData[offset + i] * windowCoeff
      im[i] = 0
    }

    for (let size = 2; size <= fftSize; size *= 2) {
      const half = size / 2
      const angle = -2 * Math.PI / size
      for (let i = 0; i < fftSize; i += size) {
        for (let j = 0; j < half; j++) {
          const cos = Math.cos(angle * j)
          const sin = Math.sin(angle * j)
          const tRe = re[i + j + half] * cos - im[i + j + half] * sin
          const tIm = re[i + j + half] * sin + im[i + j + half] * cos
          re[i + j + half] = re[i + j] - tRe
          im[i + j + half] = im[i + j] - tIm
          re[i + j] += tRe
          im[i + j] += tIm
        }
      }
    }

    for (let i = 0; i < fftSize / 2; i++) {
      magnitudes[i] = Math.sqrt(re[i] * re[i] + im[i] * im[i])
    }

    let bass = 0
    for (let i = 1; i < bassEnd; i++) bass += magnitudes[i]
    bass /= Math.max(bassEnd - 1, 1)

    let mid = 0
    for (let i = bassEnd; i < midEnd; i++) mid += magnitudes[i]
    mid /= Math.max(midEnd - bassEnd, 1)

    let treble = 0
    for (let i = midEnd; i < trebleEnd; i++) treble += magnitudes[i]
    treble /= Math.max(trebleEnd - midEnd, 1)

    const bassDelta = bass - prevBass
    const midDelta = mid - prevMid
    const trebleDelta = treble - prevTreble

    prevBass = bass
    prevMid = mid
    prevTreble = treble

    if (time - lastEventTime >= MIN_GAP) {
      const pattern: { duration: number; delay?: number; intensity?: number }[] = []

      if (bassDelta > prevBass * 0.4 && bass > 0.02) {
        pattern.push({ duration: 40, intensity: Math.min(bass * 8, 1) })
      }
      if (midDelta > prevMid * 0.5 && mid > 0.01) {
        pattern.push({ duration: 25, delay: 15, intensity: Math.min(mid * 12, 0.8) })
      }
      if (trebleDelta > prevTreble * 0.5 && treble > 0.005) {
        pattern.push({ duration: 15, delay: 30, intensity: Math.min(treble * 20, 0.6) })
      }

      if (pattern.length > 0) {
        timeline.push({ time, pattern })
        lastEventTime = time
      }
    }

    frameCount++
    if (frameCount % 500 === 0) {
      await yieldToMain()
    }
  }

  return { timeline, duration: decoded.duration }
}

let analyzeQueue: Promise<void> = Promise.resolve()

function enqueueAnalysis(
  track: MusicTrack,
  cache: Map<string, HapticEvent[]>,
  promises: Map<string, Promise<HapticEvent[]>>
): Promise<HapticEvent[]> {
  if (cache.has(track.id)) return Promise.resolve(cache.get(track.id)!)
  if (promises.has(track.id)) return promises.get(track.id)!

  const promise = new Promise<HapticEvent[]>((resolve) => {
    analyzeQueue = analyzeQueue.then(async () => {
      if (cache.has(track.id)) {
        resolve(cache.get(track.id)!)
        return
      }
      const result = await analyzeAudio(track.src)
      cache.set(track.id, result.timeline)
      resolve(result.timeline)
    })
  })

  promises.set(track.id, promise)
  return promise
}

function audiosToTracks(audios: AudioInfoProps[] | null): MusicTrack[] {
  if (!audios) return []
  return audios.map((audio, i) => ({
    id: audio.id,
    title: audio.title,
    artist: audio.username,
    color: TRACK_COLORS[i % TRACK_COLORS.length],
    src: audio.audio,
    thumbnail: audio.thumbnail,
  }))
}

type MusicPageProps = {
  audios: AudioInfoProps[] | null
}

export default function MusicPage({ audios }: MusicPageProps) {
  const tracks = audiosToTracks(audios)

  const [activeTrack, setActiveTrack] = useState<MusicTrack | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(80)
  const [isMuted, setIsMuted] = useState(false)

  const { trigger } = useWebHaptics({ debug: process.env.NODE_ENV !== "production" })

  const tap = useCallback(() => {
    trigger([{ duration: 8, intensity: 0.3 }])
  }, [trigger])

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const rafRef = useRef<number>(0)
  const timelineCacheRef = useRef<Map<string, HapticEvent[]>>(new Map())
  const analyzePromisesRef = useRef<Map<string, Promise<HapticEvent[]>>>(new Map())
  const activeTimelineRef = useRef<HapticEvent[]>([])
  const nextEventIdxRef = useRef(0)

  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.preload = "auto"
    }
    return audioRef.current
  }, [])

  const updateLoop = useCallback(() => {
    const audio = audioRef.current
    if (!audio || audio.paused) return

    const time = audio.currentTime
    setCurrentTime(time)
    setDuration(audio.duration || 0)
    setProgress(audio.duration ? (time / audio.duration) * 100 : 0)

    const timeline = activeTimelineRef.current
    let idx = nextEventIdxRef.current

    while (idx < timeline.length && timeline[idx].time <= time) {
      trigger(timeline[idx].pattern)
      idx++
    }
    nextEventIdxRef.current = idx

    rafRef.current = requestAnimationFrame(updateLoop)
  }, [trigger])

  useEffect(() => {
    if (isPlaying) {
      rafRef.current = requestAnimationFrame(updateLoop)
    }
    return () => cancelAnimationFrame(rafRef.current)
  }, [isPlaying, updateLoop])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100
    }
  }, [volume, isMuted])

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current)
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ""
      }
    }
  }, [])

  useEffect(() => {
    for (const track of tracks) {
      enqueueAnalysis(track, timelineCacheRef.current, analyzePromisesRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const playTrack = useCallback(
    async (track: MusicTrack) => {
      const audio = getAudio()
      const isNewTrack = activeTrack?.id !== track.id

      if (isNewTrack) {
        audio.pause()
        cancelAnimationFrame(rafRef.current)
        setIsPlaying(false)
        setActiveTrack(track)
        setProgress(0)
        setCurrentTime(0)

        let timeline = timelineCacheRef.current.get(track.id)

        if (!timeline) {
          setIsLoading(true)
          try {
            timeline = await enqueueAnalysis(track, timelineCacheRef.current, analyzePromisesRef.current)
          } finally {
            setIsLoading(false)
          }
        }

        activeTimelineRef.current = timeline
        nextEventIdxRef.current = 0

        audio.src = track.src
        audio.load()
        audio.volume = isMuted ? 0 : volume / 100

        audio.onended = () => {
          setIsPlaying(false)
          setProgress(100)
        }

        audio.onloadedmetadata = () => {
          setDuration(audio.duration)
        }

        await new Promise<void>((resolve) => {
          audio.oncanplay = () => resolve()
        })
      }

      await audio.play()
      setIsPlaying(true)
    },
    [activeTrack, isMuted, volume, getAudio]
  )

  const handlePlay = useCallback(
    (track: MusicTrack) => {
      tap()
      playTrack(track)
    },
    [playTrack, tap]
  )

  const handlePause = useCallback(() => {
    tap()
    audioRef.current?.pause()
    cancelAnimationFrame(rafRef.current)
    setIsPlaying(false)
  }, [tap])

  const handleSeek = useCallback(
    (percent: number) => {
      const audio = audioRef.current
      if (!audio || !audio.duration) return
      tap()
      const seekTime = (percent / 100) * audio.duration
      audio.currentTime = seekTime
      setCurrentTime(seekTime)
      setProgress(percent)

      const timeline = activeTimelineRef.current
      let idx = 0
      while (idx < timeline.length && timeline[idx].time < seekTime) idx++
      nextEventIdxRef.current = idx
    },
    [tap]
  )

  const handlePrev = useCallback(() => {
    if (!activeTrack || tracks.length === 0) return
    tap()
    const idx = tracks.findIndex((t) => t.id === activeTrack.id)
    const prev = tracks[(idx - 1 + tracks.length) % tracks.length]
    playTrack(prev)
  }, [activeTrack, tracks, playTrack, tap])

  const handleNext = useCallback(() => {
    if (!activeTrack || tracks.length === 0) return
    tap()
    const idx = tracks.findIndex((t) => t.id === activeTrack.id)
    const next = tracks[(idx + 1) % tracks.length]
    playTrack(next)
  }, [activeTrack, tracks, playTrack, tap])

  return (
    <main className="min-h-screen pt-15 p-4 pb-28 bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">music</h1>
          <p className="text-muted-foreground mt-1">click a tile to start playing</p>
        </div>

        {tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Music className="h-16 w-16 text-muted-foreground/40 mb-4" />
            <h2 className="text-xl font-semibold mb-2">no music yet</h2>
            <p className="text-muted-foreground max-w-md">
              upload some tracks to get started. head over to the upload page to add your first song.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tracks.map((track) => (
              <MusicTile
                key={track.id}
                track={track}
                isPlaying={isPlaying && activeTrack?.id === track.id}
                isActive={activeTrack?.id === track.id}
                isLoading={isLoading && activeTrack?.id === track.id}
                onPlay={handlePlay}
                onPause={handlePause}
                progress={activeTrack?.id === track.id ? progress : 0}
                currentTime={
                  activeTrack?.id === track.id ? formatTime(currentTime) : "0:00"
                }
                duration={
                  activeTrack?.id === track.id ? formatTime(duration) : "0:00"
                }
                onSeek={activeTrack?.id === track.id ? handleSeek : undefined}
              />
            ))}
          </div>
        )}
      </div>

      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 transition-transform duration-300",
          activeTrack ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
          <div
            className="w-10 h-10 rounded-md flex items-center justify-center shrink-0 overflow-hidden"
            style={{ backgroundColor: activeTrack?.color }}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 text-white animate-spin" />
            ) : activeTrack?.thumbnail && activeTrack.thumbnail !== "/placeholder.png" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={activeTrack.thumbnail} alt={activeTrack.title} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-xs font-bold">
                {activeTrack?.title.charAt(0)}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1 hidden sm:block">
            <p className="text-sm font-medium truncate">{activeTrack?.title}</p>
            <p className="text-xs text-muted-foreground truncate">
              {isLoading ? "Analyzing beats..." : activeTrack?.artist}
            </p>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrev} disabled={isLoading}>
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              disabled={isLoading}
              onClick={() => (isPlaying ? handlePause() : activeTrack && handlePlay(activeTrack))}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 ml-0.5" />
              )}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNext} disabled={isLoading}>
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 hidden md:flex items-center gap-2">
            <span className="text-xs tabular-nums text-muted-foreground w-10 text-right">
              {formatTime(currentTime)}
            </span>
            <Slider
              value={[progress]}
              max={100}
              step={0.1}
              className="flex-1"
              onValueChange={(v) => handleSeek(v[0])}
            />
            <span className="text-xs tabular-nums text-muted-foreground w-10">
              {formatTime(duration)}
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-2 w-32">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => { tap(); setIsMuted(!isMuted) }}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume]}
              max={100}
              step={1}
              className="flex-1"
              onValueChange={(v) => {
                setVolume(v[0])
                setIsMuted(v[0] === 0)
              }}
            />
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes bar-bounce {
          0%, 100% { height: 20%; }
          50% { height: 100%; }
        }
      `}</style>
    </main>
  )
}
