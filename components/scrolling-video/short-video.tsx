"use client"

import type React from "react"

import { useRef, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ShortsControls } from "./shorts-controls"
import { Play, VolumeX, Volume2, X } from "lucide-react"
import { useSignal } from "@preact/signals-react"
import { useSignals } from "@preact/signals-react/runtime"
import { useAuth } from "@/context/AuthProvider"
import upsert from "@/lib/supabase/upsert"
import { toast } from "sonner"
import type { ShortVideoData } from "./types"

type ShortVideoProps = {
  short: ShortVideoData
  isActive: boolean
  currentUser: any
}

export function ShortVideo({ short, isActive, currentUser }: ShortVideoProps) {
  useSignals();
  const router = useRouter()
  const auth = useAuth()
  const supabase = auth?.supabase
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout>(null)
  const interactionTimeoutRef = useRef<NodeJS.Timeout>(null)
  const showEndOverlay = useSignal(false)

  const isPlaying = useSignal(false)
  const isMuted = useSignal(true)
  const showControls = useSignal(true)
  const isInteracting = useSignal(false)
  const isSubscribed = useSignal(short.is_subscribed ?? false)
  const subscriberCount = useSignal(short.subscribers ?? 0)

  const handleSubscribe = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!currentUser) {
      toast.error("Please sign in to subscribe")
      return
    }
    if (!supabase || currentUser.id === short.creator_id) return

    const newVal = !isSubscribed.value
    isSubscribed.value = newVal
    subscriberCount.value += newVal ? 1 : -1

    await upsert(
      supabase,
      "subscribers",
      { vendor: short.creator_id, subscriber: currentUser.id },
      { is_subscribed: newVal },
    )
  }

  const cutDurationHalf = useCallback(() => {
    if (videoRef.current) {
      const video = videoRef.current
      const fakeEnd = video.duration > 20 ? 20 : video.duration / 2

      if (video.currentTime >= fakeEnd) {
        showEndOverlay.value = true
        video.pause()
        video.currentTime = fakeEnd
        isPlaying.value = false
      }
    }
  }, [showEndOverlay, isPlaying])

  // Auto-play/pause based on visibility
  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.play()
        isPlaying.value = true
      } else {
        videoRef.current.pause()
        isPlaying.value = false
      }
    }
  }, [isActive, isPlaying])

  // Stop playback when unmounting (e.g. navigating /shorts → /settings)
  useEffect(() => {
    return () => {
      const el = videoRef.current
      if (el) {
        el.pause()
        el.muted = true
        el.volume = 0
        el.removeAttribute("src")
        el.removeAttribute("poster")
        el.srcObject = null
        try {
          el.load()
        } catch {
          // ignore
        }
      }
      isPlaying.value = false
    }
  }, [])

  useEffect(() => {
    const videoElement = videoRef.current;
    videoElement?.addEventListener("timeupdate", cutDurationHalf);

    return () => {
      videoElement?.removeEventListener("timeupdate", cutDurationHalf);
    }
  }, [cutDurationHalf]);

  // Handle controls visibility - only hide if not interacting and playing
  useEffect(() => {
    if (showControls.value && isPlaying.value && !isInteracting.value) {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
      controlsTimeoutRef.current = setTimeout(() => {
        showControls.value = false
      }, 3000)
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
    }
  }, [showControls, isPlaying, isInteracting])

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying.value) {
        videoRef.current.pause()
        isPlaying.value = false
      } else {
        videoRef.current.play()
        isPlaying.value = true
      }
    }
    handleInteraction()
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted.value
      isMuted.value = !isMuted.value
    }
    handleInteraction()
  }

  const handleVideoClick = (e: React.MouseEvent) => {
    // Only toggle play if clicking on the video itself, not on buttons
    const target = e.target as HTMLElement
    if (target.tagName === "VIDEO" || target.closest(".video-click-area")) {
      togglePlay()
    }
  }

  const handleInteraction = () => {
    isInteracting.value = true
    showControls.value = true

    // Clear existing timeout
    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current)
    }

    // Set interaction to false after 5 seconds
    interactionTimeoutRef.current = setTimeout(() => {
      isInteracting.value = false
    }, 5000)
  }

  const handleClose = () => {
    router.push("/")
  }

  const handleEndOverlayClick = () => {
    // Navigate to full video page
    router.push(`/video/${short.id}`)
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M"
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K"
    }
    return num.toString()
  }

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
      if (interactionTimeoutRef.current) {
        clearTimeout(interactionTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="w-full h-full bg-black flex items-center justify-center">
      {/* 9:16 aspect ratio container */}
      <div
        className="relative bg-black rounded-lg overflow-hidden shadow-2xl"
        style={{
          width: "min(100vw, calc(100vh * 9 / 16))",
          height: "min(100vh, calc(100vw * 16 / 9))",
          aspectRatio: "9/16",
        }}
        onMouseMove={handleInteraction}
        onTouchStart={handleInteraction}
      >

        {/* End overlay - blurry transparent screen */}
        {showEndOverlay.value && (
          <div
            className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center cursor-pointer"
            onClick={handleEndOverlayClick}
          >
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mb-4 mx-auto backdrop-blur-sm border border-white/30">
                <Play className="h-10 w-10 text-white" />
              </div>
              <p className="text-white font-semibold text-lg mb-2">Tap to continue watching</p>
              <p className="text-white/80 text-sm">Watch the full video</p>
            </div>
          </div>
        )}

        {/* Video with click area */}
        <div className="video-click-area w-full h-full" onClick={handleVideoClick}>
          <video
            ref={videoRef}
            src={short.video}
            poster={short.thumbnail}
            className="w-full h-full object-cover cursor-pointer"
            loop
            muted={isMuted.value}
            playsInline
            disablePictureInPicture
          />
        </div>

        {/* Close button - Always visible */}
        <div className="absolute top-4 left-4 z-30">
          <Button
            onClick={handleClose}
            variant="secondary"
            size="icon"
            className="rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm"
          >
            <X className="h-5 w-5 text-white" />
          </Button>
        </div>

        {/* Controls overlay */}
        {!showEndOverlay.value && (
          <div className="absolute inset-0 z-20">
            {/* Top controls */}
            <div
              className={`absolute top-4 right-4 flex gap-2 transition-opacity duration-300 ${
                showControls.value || isInteracting.value ? "opacity-100" : "md:opacity-0 opacity-100"
              }`}
            >
              <Button
                onClick={toggleMute}
                variant="secondary"
                size="icon"
                className="rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm"
              >
                {isMuted.value ? (
                  <VolumeX className="h-4 w-4 text-white" />
                ) : (
                  <Volume2 className="h-4 w-4 text-white" />
                )}
              </Button>
            </div>

            {/* Bottom content - Always visible */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
              <div className="flex items-end justify-between">
                {/* Video info */}
                <div className="flex-1 mr-4">
                  {/* Creator info */}
                  <div className="flex items-center gap-3 mb-3">
                    <Link href={`/user/${short.creator_id}`} onClick={(e) => e.stopPropagation()}>
                      <Avatar className="h-8 w-8 border-2 border-white">
                        <AvatarImage src={short.avatar_url || "/placeholder.svg"} alt={short.username} />
                        <AvatarFallback>{short.username[0]}</AvatarFallback>
                      </Avatar>
                    </Link>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/user/${short.creator_id}`}
                          className="text-white font-semibold hover:underline text-sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          @{short.username}
                        </Link>
                        {currentUser && currentUser.id !== short.creator_id && (
                          <button
                            onClick={handleSubscribe}
                            className={`px-3 py-0.5 rounded-full text-xs font-semibold transition-colors ${
                              isSubscribed.value
                                ? "bg-white/20 text-white/80 hover:bg-white/30"
                                : "bg-white text-black hover:bg-white/90"
                            }`}
                          >
                            {isSubscribed.value ? "Subscribed" : "Subscribe"}
                          </button>
                        )}
                      </div>
                      <p className="text-white/80 text-xs">{formatNumber(subscriberCount.value)} subscribers</p>
                    </div>
                  </div>

                  {/* Video title and description */}
                  <h3 className="text-white font-semibold text-base mb-1 line-clamp-1">{short.title}</h3>
                  <p className="text-white/90 text-sm mb-2 line-clamp-2">{short.description}</p>
                  <p className="text-white/70 text-xs">{formatNumber(short.views)} views</p>
                </div>

                {/* Action buttons - Always visible */}
                <div onClick={(e) => e.stopPropagation()}>
                  <ShortsControls
                    short={short}
                    currentUser={currentUser}
                    onInteraction={handleInteraction}
                    alwaysVisible={true}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}