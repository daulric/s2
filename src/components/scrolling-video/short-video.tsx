"use client"

import type React from "react"

import { useRef, useEffect } from "react"
import { useSignal } from "@preact/signals-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ShortsControls } from "./shorts-controls"
import { Play, VolumeX, Volume2, X } from "lucide-react"
import type { VideoInfoProps } from "@/lib/videos/data-to-video-format"
import { useSignals } from "@preact/signals-react/runtime"

interface shorts_extends extends VideoInfoProps {
  likes?: number
  is_liked?: boolean
  is_subscribed?: boolean | null,
  subscribers?: number
}

type ShortVideoProps = {
  short: shorts_extends
  isActive: boolean
  currentUser: any
}

export function ShortVideo({ short, isActive, currentUser }: ShortVideoProps) {
  useSignals()
  const isPlaying = useSignal(false)
  const isMuted = useSignal(false)
  const showControls = useSignal(true)
  const isInteracting = useSignal(false)

  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout>(null)
  const interactionTimeoutRef = useRef<NodeJS.Timeout>(null)

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
  }, [isActive])

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
  }, [showControls.value, isPlaying.value, isInteracting.value])

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
      isMuted.value = !isMuted.value
      videoRef.current.muted = isMuted.value
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
        {/* Video with click area */}
        <div className="video-click-area w-full h-full" onClick={handleVideoClick}>
          <video
            ref={videoRef}
            src={short.video}
            poster={short.thumbnail}
            className="w-full h-full cursor-pointer"
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

        {/* Play/Pause overlay */}
        {!isPlaying.value && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <Button
              onClick={togglePlay}
              variant="secondary"
              size="icon"
              className="rounded-full h-16 w-16 bg-black/50 hover:bg-black/70 pointer-events-auto"
            >
              <Play className="h-8 w-8 text-white" />
            </Button>
          </div>
        )}

        {/* Controls overlay */}
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
              {isMuted.value ? <VolumeX className="h-4 w-4 text-white" /> : <Volume2 className="h-4 w-4 text-white" />}
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
                      <AvatarImage src={short.avatar_url || "/logo.jpeg"} alt={short.username} />
                      <AvatarFallback>{short.username[0]}</AvatarFallback>
                    </Avatar>
                  </Link>
                  <div>
                    <Link
                      href={`/user/${short.creator_id}`}
                      className="text-white font-semibold hover:underline text-sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      @{short.username}
                    </Link>
                    <p className="text-white/80 text-xs">{formatNumber(short.subscribers || 0)} subscribers</p>
                  </div>
                  {/* Subscribe button - Always visible */}
                  { short.is_subscribed !== null && (
                    <Button
                      variant="default"
                      size="sm"
                      className={`ml-2 ${short.is_subscribed ? "bg-gray-800 text-white hover:bg-white/90 hover:text-gray-800/90" : "bg-white text-black hover:bg-black/90 hover:text-white/90"} text-xs px-3 py-1 h-7`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleInteraction()
                      }}
                    >
                      {short.is_subscribed ? "Subscribed" : "Subscribe"}
                    </Button>
                  )}
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
      </div>
    </div>
  )
}