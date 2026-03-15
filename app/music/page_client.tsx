"use client"

import { useRef, useCallback, useEffect } from "react"
import { OfflineAudioContext } from "standardized-audio-context"
import { useSignals, useSignal } from "@preact/signals-react/runtime"
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
import { useAuth } from "@/context/AuthProvider"
import Link from "next/link"
import { Upload } from "lucide-react"

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

function getAudioMimeFromPath(path?: string): string {
  if (!path) return "audio/mpeg"
  const ext = path.split(".").pop()?.toLowerCase()
  if (ext === "mp3") return "audio/mpeg"
  if (ext === "m4a") return "audio/mp4"
  if (ext === "aac") return "audio/aac"
  if (ext === "wav") return "audio/wav"
  if (ext === "ogg") return "audio/ogg"
  return "audio/mpeg"
}

function toPlayableAudioBlob(blob: Blob, path?: string): Blob {
  const mime = getAudioMimeFromPath(path)
  if (blob.type === mime) return blob
  return new Blob([blob], { type: mime })
}

async function fetchAudioBlob(src: string): Promise<Blob | null> {
  try {
    const res = await fetch(src)
    if (!res.ok) return null
    return await res.blob()
  } catch {
    return null
  }
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
  const fftSize = 1024
  const binFreq = sampleRate / fftSize
  const halfFFT = fftSize / 2

  const bands = {
    subBass:  { lo: Math.floor(20 / binFreq),   hi: Math.floor(80 / binFreq) },
    kick:     { lo: Math.floor(80 / binFreq),   hi: Math.floor(150 / binFreq) },
    snare:    { lo: Math.floor(150 / binFreq),  hi: Math.floor(1000 / binFreq) },
    hihat:    { lo: Math.floor(3000 / binFreq), hi: Math.min(Math.floor(8000 / binFreq), halfFFT) },
  }

  const HISTORY = 30
  const history = {
    subBass: new Float32Array(HISTORY),
    kick:    new Float32Array(HISTORY),
    snare:   new Float32Array(HISTORY),
    hihat:   new Float32Array(HISTORY),
  }
  let histIdx = 0

  const timeline: HapticEvent[] = []
  let lastKickTime = -Infinity
  let lastSnareTime = -Infinity
  let lastHihatTime = -Infinity
  const KICK_GAP = 0.06
  const SNARE_GAP = 0.05
  const HIHAT_GAP = 0.04

  const re = new Float32Array(fftSize)
  const im = new Float32Array(fftSize)
  const magnitudes = new Float32Array(halfFFT)
  let frameCount = 0

  for (let offset = 0; offset + fftSize <= totalSamples; offset += hopSize) {
    const time = offset / sampleRate

    for (let i = 0; i < fftSize; i++) {
      const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (fftSize - 1))
      re[i] = channelData[offset + i] * w
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

    for (let i = 0; i < halfFFT; i++) {
      magnitudes[i] = Math.sqrt(re[i] * re[i] + im[i] * im[i])
    }

    const bandEnergy = (b: { lo: number; hi: number }) => {
      let sum = 0
      for (let i = b.lo; i < b.hi; i++) sum += magnitudes[i]
      return sum / Math.max(b.hi - b.lo, 1)
    }

    const subBass = bandEnergy(bands.subBass)
    const kick = bandEnergy(bands.kick)
    const snare = bandEnergy(bands.snare)
    const hihat = bandEnergy(bands.hihat)

    const avg = (arr: Float32Array) => {
      let s = 0
      for (let i = 0; i < arr.length; i++) s += arr[i]
      return s / arr.length
    }

    const kickCombined = kick + subBass * 0.6
    const kickAvg = avg(history.kick) + avg(history.subBass) * 0.6
    const snareAvg = avg(history.snare)
    const hihatAvg = avg(history.hihat)

    const kickThreshold = Math.max(kickAvg * 1.4, 0.015)
    const snareThreshold = Math.max(snareAvg * 1.5, 0.008)
    const hihatThreshold = Math.max(hihatAvg * 1.6, 0.004)

    const pattern: { duration: number; delay?: number; intensity?: number }[] = []

    if (kickCombined > kickThreshold && time - lastKickTime >= KICK_GAP) {
      const intensity = Math.min((kickCombined / kickThreshold) * 0.5, 1)
      pattern.push({ duration: 45, intensity })
      lastKickTime = time
    }

    if (snare > snareThreshold && time - lastSnareTime >= SNARE_GAP) {
      const intensity = Math.min((snare / snareThreshold) * 0.4, 0.85)
      pattern.push({ duration: 20, delay: 10, intensity })
      lastSnareTime = time
    }

    if (hihat > hihatThreshold && time - lastHihatTime >= HIHAT_GAP) {
      const intensity = Math.min((hihat / hihatThreshold) * 0.3, 0.5)
      pattern.push({ duration: 10, delay: 20, intensity })
      lastHihatTime = time
    }

    if (pattern.length > 0) {
      timeline.push({ time, pattern })
    }

    history.subBass[histIdx % HISTORY] = subBass
    history.kick[histIdx % HISTORY] = kick
    history.snare[histIdx % HISTORY] = snare
    history.hihat[histIdx % HISTORY] = hihat
    histIdx++

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
      try {
        const result = await analyzeAudio(track.src)
        cache.set(track.id, result.timeline)
        resolve(result.timeline)
      } catch {
        cache.set(track.id, [])
        resolve([])
      }
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
    audioPath: audio.audio_path,
    thumbnail: audio.thumbnail,
    listens: audio.listens,
    creatorId: audio.creator_id,
    avatarUrl: audio.avatar_url,
  }))
}

type MusicPageProps = {
  audios: AudioInfoProps[] | null
  selectedId?: string
}

export default function MusicPage({ audios, selectedId }: MusicPageProps) {
  useSignals()
  const { supabase } = useAuth()
  const isSafariBrowser =
    typeof navigator !== "undefined" && /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

  const tracks = useSignal<MusicTrack[]>(audiosToTracks(audios))
  const activeTrack = useSignal<MusicTrack | null>(null)
  const isPlaying = useSignal(false)
  const isLoading = useSignal(false)
  const progress = useSignal(0)
  const currentTime = useSignal(0)
  const duration = useSignal(0)
  const volume = useSignal(80)
  const isMuted = useSignal(false)
  const beatIntensity = useSignal(0)

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
  const blobUrlCacheRef = useRef<Map<string, string>>(new Map())
  const hasResolvedSelectedIdRef = useRef(false)

  const updateLoop = useCallback(() => {
    const audio = audioRef.current
    if (!audio || audio.paused) return

    const time = audio.currentTime
    currentTime.value = time
    duration.value = audio.duration || 0
    progress.value = audio.duration ? (time / audio.duration) * 100 : 0

    const timeline = activeTimelineRef.current
    let idx = nextEventIdxRef.current
    let hitBeat = false

    while (idx < timeline.length && timeline[idx].time <= time) {
      trigger(timeline[idx].pattern)
      hitBeat = true
      idx++
    }
    nextEventIdxRef.current = idx

    if (hitBeat) {
      beatIntensity.value = 1
    } else {
      beatIntensity.value = Math.max(0, beatIntensity.value * 0.82)
    }

    rafRef.current = requestAnimationFrame(updateLoop)
  }, [trigger, currentTime, duration, progress, beatIntensity])

  useEffect(() => {
    if (isPlaying.value) {
      rafRef.current = requestAnimationFrame(updateLoop)
    }
    return () => cancelAnimationFrame(rafRef.current)
  }, [isPlaying.value, updateLoop])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted.value ? 0 : volume.value / 100
    }
  }, [volume.value, isMuted.value, volume, isMuted])

  useEffect(() => {
    let cancelled = false
    const preloadBlobs = async () => {
      if (isSafariBrowser) return
      for (const track of tracks.value) {
        if (cancelled) break
        if (blobUrlCacheRef.current.has(track.id)) continue
        if (!track.audioPath) continue
        const data = await fetchAudioBlob(track.src)
        if (data && !cancelled) {
          const playableBlob = toPlayableAudioBlob(data, track.audioPath || track.src)
          blobUrlCacheRef.current.set(track.id, URL.createObjectURL(playableBlob))
        }
      }
    }
    preloadBlobs()
    return () => {
      cancelled = true
      cancelAnimationFrame(rafRef.current)
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ""
      }
      blobUrlCacheRef.current.forEach((url) => URL.revokeObjectURL(url))
      blobUrlCacheRef.current.clear()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSafariBrowser])

  const hasInteractedRef = useRef(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    if (isSafariBrowser) return

    const startPreAnalysis = () => {
      if (hasInteractedRef.current) return
      hasInteractedRef.current = true
      for (const track of tracks.value) {
        enqueueAnalysis(track, timelineCacheRef.current, analyzePromisesRef.current)
      }
    }

    document.addEventListener("click", startPreAnalysis, { once: true })
    document.addEventListener("touchstart", startPreAnalysis, { once: true })
    return () => {
      document.removeEventListener("click", startPreAnalysis)
      document.removeEventListener("touchstart", startPreAnalysis)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSafariBrowser])

  const incrementListens = useCallback(async (trackId: string) => {
    const current = tracks.value.find((t) => t.id === trackId)
    if (!current) return
    const newCount = (current.listens ?? 0) + 1
    tracks.value = tracks.value.map((t) => t.id === trackId ? { ...t, listens: newCount } : t)
    await supabase.from("audios").update({ listens: newCount }).eq("audio_id", trackId)
  }, [tracks, supabase])

  const startPlayback = useCallback(
    (track: MusicTrack, blobUrl: string) => {
      const audio = audioRef.current
      if (!audio) return

      audio.src = blobUrl
      audio.volume = isMuted.value ? 0 : volume.value / 100
      const playPromise = audio.play()
      if (playPromise) {
        playPromise
          .then(() => {
            isPlaying.value = true
            isLoading.value = false
            incrementListens(track.id)
          })
          .catch(() => {
            isPlaying.value = false
            isLoading.value = false
          })
      } else {
        isPlaying.value = true
        isLoading.value = false
        incrementListens(track.id)
      }

      const cached = timelineCacheRef.current.get(track.id)
      if (!cached) {
        enqueueAnalysis(track, timelineCacheRef.current, analyzePromisesRef.current)
          .then((timeline) => {
            activeTimelineRef.current = timeline
          })
      }
    },
    [isMuted, volume, incrementListens, isPlaying, isLoading]
  )

  const playTrack = useCallback(
    (track: MusicTrack) => {
      const audio = audioRef.current
      if (!audio) return

      const isNew = activeTrack.value?.id !== track.id

      if (!isNew) {
        const p = audio.play()
        if (p) {
          p.then(() => {
            isPlaying.value = true
          }).catch(() => {
            isPlaying.value = false
          })
        } else {
          isPlaying.value = true
        }
        return
      }

      audio.pause()
      cancelAnimationFrame(rafRef.current)
      isPlaying.value = false
      activeTrack.value = track
      progress.value = 0
      currentTime.value = 0

      const cached = timelineCacheRef.current.get(track.id)
      activeTimelineRef.current = cached ?? []
      nextEventIdxRef.current = 0

      if (isSafariBrowser) {
        audio.src = track.src
        audio.volume = isMuted.value ? 0 : volume.value / 100
        const p = audio.play()
        if (p) {
          p.then(() => {
            isPlaying.value = true
            isLoading.value = false
            incrementListens(track.id)
          }).catch(() => {
            isPlaying.value = false
            isLoading.value = false
          })
        } else {
          isPlaying.value = true
          isLoading.value = false
          incrementListens(track.id)
        }
        activeTimelineRef.current = []
        return
      }

      const blobUrl = blobUrlCacheRef.current.get(track.id)
      if (blobUrl) {
        startPlayback(track, blobUrl)
      } else {
        isLoading.value = true
        fetchAudioBlob(track.src).then((data) => {
          if (data) {
            const playableBlob = toPlayableAudioBlob(data, track.audioPath || track.src)
            const url = URL.createObjectURL(playableBlob)
            blobUrlCacheRef.current.set(track.id, url)
            if (activeTrack.value?.id === track.id) {
              startPlayback(track, url)
            }
          } else {
            isLoading.value = false
          }
        })
      }
    },
    [activeTrack, supabase, isSafariBrowser, isMuted, volume, incrementListens, isPlaying, isLoading, progress, currentTime, startPlayback]
  )

  useEffect(() => {
    if (!selectedId) return
    if (hasResolvedSelectedIdRef.current) return

    const matchedTrack = tracks.value.find((track) => track.id === selectedId)
    hasResolvedSelectedIdRef.current = true

    if (!matchedTrack) return
    playTrack(matchedTrack)
  }, [selectedId, tracks, playTrack])

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
    isPlaying.value = false
    beatIntensity.value = 0
  }, [tap, isPlaying, beatIntensity])

  const handleSeek = useCallback(
    (percent: number) => {
      const audio = audioRef.current
      if (!audio || !audio.duration) return
      tap()
      const seekTime = (percent / 100) * audio.duration
      audio.currentTime = seekTime
      currentTime.value = seekTime
      progress.value = percent

      const timeline = activeTimelineRef.current
      let idx = 0
      while (idx < timeline.length && timeline[idx].time < seekTime) idx++
      nextEventIdxRef.current = idx
    },
    [tap, currentTime, progress]
  )

  const handlePrev = useCallback(() => {
    if (!activeTrack.value || tracks.value.length === 0) return
    tap()
    const idx = tracks.value.findIndex((t) => t.id === activeTrack.value?.id)
    const prev = tracks.value[(idx - 1 + tracks.value.length) % tracks.value.length]
    playTrack(prev)
  }, [activeTrack, tracks, playTrack, tap])

  const handleNext = useCallback(() => {
    if (!activeTrack.value || tracks.value.length === 0) return
    tap()
    const idx = tracks.value.findIndex((t) => t.id === activeTrack.value?.id)
    const next = tracks.value[(idx + 1) % tracks.value.length]
    playTrack(next)
  }, [activeTrack, tracks, playTrack, tap])

  return (
    <main className="min-h-screen pt-15 p-4 pb-28 bg-background">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={audioRef}
        playsInline
        preload="auto"
        onEnded={() => {
          isPlaying.value = false
          progress.value = 100
          beatIntensity.value = 0
          nextEventIdxRef.current = 0
        }}
        onLoadedMetadata={(e) => {
          duration.value = (e.target as HTMLAudioElement).duration
        }}
      />
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">music</h1>
          <p className="text-muted-foreground mt-1">click a tile to start playing</p>
        </div>

        {tracks.value.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Music className="h-16 w-16 text-muted-foreground/40 mb-4" />
            <h2 className="text-xl font-semibold mb-2">no music yet</h2>
            <p className="text-muted-foreground max-w-md mb-4">
              upload some tracks to get started. head over to the upload page to add your first song.
            </p>
            <Link href="/upload/music">
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Upload Music
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tracks.value.map((track) => (
              <MusicTile
                key={track.id}
                track={track}
                isPlaying={isPlaying.value && activeTrack.value?.id === track.id}
                isActive={activeTrack.value?.id === track.id}
                isLoading={isLoading.value && activeTrack.value?.id === track.id}
                onPlay={handlePlay}
                onPause={handlePause}
                progress={activeTrack.value?.id === track.id ? progress.value : 0}
                currentTime={
                  activeTrack.value?.id === track.id ? formatTime(currentTime.value) : "0:00"
                }
                duration={
                  activeTrack.value?.id === track.id ? formatTime(duration.value) : "0:00"
                }
                onSeek={activeTrack.value?.id === track.id ? handleSeek : undefined}
                beatIntensity={activeTrack.value?.id === track.id ? beatIntensity.value : 0}
              />
            ))}
          </div>
        )}
      </div>

      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 transition-transform duration-300",
          activeTrack.value ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
          <div
            className="w-10 h-10 rounded-md flex items-center justify-center shrink-0 overflow-hidden"
            style={{ backgroundColor: activeTrack.value?.color }}
          >
            {isLoading.value ? (
              <Loader2 className="h-4 w-4 text-white animate-spin" />
            ) : activeTrack.value?.thumbnail && activeTrack.value.thumbnail !== "/placeholder.png" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={activeTrack.value.thumbnail} alt={activeTrack.value.title} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-xs font-bold">
                {activeTrack.value?.title.charAt(0)}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1 hidden sm:block">
            <p className="text-sm font-medium truncate">{activeTrack.value?.title}</p>
            <p className="text-xs text-muted-foreground truncate">
              {isLoading.value ? "Analyzing beats..." : activeTrack.value?.artist}
            </p>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrev} disabled={isLoading.value}>
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              disabled={isLoading.value}
              onClick={() => (isPlaying.value ? handlePause() : activeTrack.value && handlePlay(activeTrack.value))}
            >
              {isLoading.value ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isPlaying.value ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 ml-0.5" />
              )}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNext} disabled={isLoading.value}>
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 hidden md:flex items-center gap-2">
            <span className="text-xs tabular-nums text-muted-foreground w-10 text-right">
              {formatTime(currentTime.value)}
            </span>
            <Slider
              value={[progress.value]}
              max={100}
              step={0.1}
              className="flex-1"
              onValueChange={(v) => handleSeek(Array.isArray(v) ? v[0] : v)}
            />
            <span className="text-xs tabular-nums text-muted-foreground w-10">
              {formatTime(duration.value)}
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-2 w-32">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => { tap(); isMuted.value = !isMuted.value }}
            >
              {isMuted.value ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <Slider
              value={[isMuted.value ? 0 : volume.value]}
              max={100}
              step={1}
              className="flex-1"
              onValueChange={(v) => {
                const next = Array.isArray(v) ? v[0] : v
                volume.value = next
                isMuted.value = next === 0
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
