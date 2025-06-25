"use client"

import type React from "react"

import { useSignal } from "@preact/signals-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Heart, MessageCircle, Share, MoreHorizontal } from "lucide-react"
import { toast } from "sonner"
import type { VideoInfoProps } from "@/lib/videos/data-to-video-format"
import { useSignals } from "@preact/signals-react/runtime"

type ShortsControlsProps = {
  short: VideoInfoProps
  currentUser: any
  onInteraction?: () => void
  alwaysVisible?: boolean
}

// Create signals for each short's state
const createShortSignals = (shortId: string, initialLikes: number) => {
  return {
    isLiked: useSignal(false),
    likeCount: useSignal(initialLikes),
  }
}

// Store signals for each short
const shortSignals = new Map<string, ReturnType<typeof createShortSignals>>()

export function ShortsControls({ short, currentUser, onInteraction, alwaysVisible = false }: ShortsControlsProps) {
  useSignals();
  // Get or create signals for this short
  if (!shortSignals.has(short.id)) {
    shortSignals.set(short.id, createShortSignals(short.id, short.views || 0))
  }

  const signals = shortSignals.get(short.id)!

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M"
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K"
    }
    return num.toString()
  }

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation()
    onInteraction?.()

    if (!currentUser) {
      toast.error("Please sign in to like videos")
      return
    }

    signals.isLiked.value = !signals.isLiked.value
    signals.likeCount.value = signals.isLiked.value ? signals.likeCount.value + 1 : signals.likeCount.value - 1

    toast.success(signals.isLiked.value ? "Added to liked videos" : "Removed from liked videos")
  }

  const handleComment = (e: React.MouseEvent) => {
    e.stopPropagation()
    onInteraction?.()

    if (!currentUser) {
      toast.error("Please sign in to comment")
      return
    }
    toast.info("Comments feature coming soon!")
  }

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation()
    onInteraction?.()

    navigator.clipboard.writeText(window.location.href)
    toast.success("Link copied to clipboard")
  }

  const handleMore = (e: React.MouseEvent) => {
    e.stopPropagation()
    onInteraction?.()

    toast.info("More options coming soon!")
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Like button - Always visible */}
      <div className="flex flex-col items-center">
        <Button
          onClick={handleLike}
          variant="ghost"
          size="icon"
          className={`rounded-full h-12 w-12 backdrop-blur-sm ${
            signals.isLiked.value ? "bg-red-500/20 hover:bg-red-500/30" : "bg-white/20 hover:bg-white/30"
          }`}
        >
          <Heart className={`h-6 w-6 ${signals.isLiked.value ? "text-red-500 fill-red-500" : "text-white"}`} />
        </Button>
        <span className="text-white text-xs mt-1 font-medium">{formatNumber(signals.likeCount.value)}</span>
      </div>

      {/* Comment button - Always visible */}
      <div className="flex flex-col items-center">
        <Button
          onClick={handleComment}
          variant="ghost"
          size="icon"
          className="rounded-full h-12 w-12 bg-white/20 hover:bg-white/30 backdrop-blur-sm"
        >
          <MessageCircle className="h-6 w-6 text-white" />
        </Button>
        <span className="text-white text-xs mt-1 font-medium">{formatNumber(0)}</span>
      </div>

      {/* Share button - Always visible */}
      <div className="flex flex-col items-center">
        <Button
          onClick={handleShare}
          variant="ghost"
          size="icon"
          className="rounded-full h-12 w-12 bg-white/20 hover:bg-white/30 backdrop-blur-sm"
        >
          <Share className="h-6 w-6 text-white" />
        </Button>
        <span className="text-white text-xs mt-1 font-medium">{formatNumber(0)}</span>
      </div>

      {/* More options - Always visible */}
      <Button
        onClick={handleMore}
        variant="ghost"
        size="icon"
        className="rounded-full h-12 w-12 bg-white/20 hover:bg-white/30 backdrop-blur-sm"
      >
        <MoreHorizontal className="h-6 w-6 text-white" />
      </Button>

      {/* Creator avatar - Always visible */}
      <div className="mt-2">
        <Avatar className="h-12 w-12 border-2 border-white">
          <AvatarImage src={short.avatar_url || "/placeholder.svg"} alt={short.username} />
          <AvatarFallback>{short.username[0]}</AvatarFallback>
        </Avatar>
      </div>
    </div>
  )
}