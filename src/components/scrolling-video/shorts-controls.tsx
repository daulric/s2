"use client"

import type React from "react"

import { useSignal, effect } from "@preact/signals-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Heart, MessageCircle, Share, MoreHorizontal } from "lucide-react"
import { toast } from "sonner"
import type { VideoInfoProps } from "@/lib/videos/data-to-video-format"
import { useSignals } from "@preact/signals-react/runtime"

interface shorts_extends extends VideoInfoProps {
  likes?: number
  is_liked?: boolean
  is_subscribed?: boolean | null,
  subscribers?: number
}

type ShortsControlsProps = {
  short: shorts_extends
  currentUser: any
  onInteraction?: () => void
  alwaysVisible?: boolean
}


export function ShortsControls({ short, currentUser, onInteraction, alwaysVisible = false }: ShortsControlsProps) {
  useSignals();
  // Get or create signals for this short
  const isLiked = useSignal(false);
  const likeCount = useSignal(0);

  if (short.is_liked) {
    isLiked.value = short.is_liked;
  }

  if (short.likes) {
    likeCount.value = short.likes;
  }

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

    if (!currentUser) {
      toast.error("Please sign in to like videos")
      return
    }

    isLiked.value = !(isLiked.value);

    likeCount.value = isLiked.value
      ? likeCount.value + 1 
      : Math.max(0, likeCount.value - 1);

    toast.success(isLiked.value ? "Added to liked videos" : "Removed from liked videos")
  }

  /*const handleComment = (e: React.MouseEvent) => {
    e.stopPropagation()
    onInteraction?.()

    if (!currentUser) {
      toast.error("Please sign in to comment")
      return
    }
    toast.info("Comments feature coming soon!")
  }*/

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation()
    onInteraction?.()

    navigator.clipboard.writeText(globalThis.location.origin + `/video/${short.id}`)
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
            isLiked.value ? "bg-red-500/20 hover:bg-red-500/30" : "bg-white/20 hover:bg-white/30"
          }`}
        >
          <Heart className={`h-6 w-6 ${isLiked.value ? "text-red-500 fill-red-500" : "text-white"}`} />
        </Button>
        <span className="text-white text-xs mt-1 font-medium">{formatNumber(likeCount.value)}</span>
      </div>

      {/* Comment button - Always visible */}
      {/*
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
      */}

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
          <AvatarImage src={short.avatar_url || "/logo.jpeg"} alt={short.username} />
          <AvatarFallback>{short.username[0]}</AvatarFallback>
        </Avatar>
      </div>
    </div>
  )
}