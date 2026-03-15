"use client"

import type React from "react"

import { useRef } from "react"
import { useSignal } from "@preact/signals-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Heart, MessageCircle, Share, MoreHorizontal } from "lucide-react"
import { toast } from "sonner"
import { useSignals } from "@preact/signals-react/runtime"
import { useAuth } from "@/context/AuthProvider"
import type { ShortVideoData } from "./types"

type ShortsControlsProps = {
  short: ShortVideoData
  currentUser: any
  onInteraction?: () => void
  alwaysVisible?: boolean
}


export function ShortsControls({ short, currentUser, onInteraction, alwaysVisible = false }: ShortsControlsProps) {
  useSignals()
  const auth = useAuth()
  const supabase = auth?.supabase

  const isLiked = useSignal(short.is_liked ?? false)
  const likeCount = useSignal(short.likes ?? 0)
  const isUpdating = useRef(false)

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M"
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K"
    }
    return num.toString()
  }

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation()
    onInteraction?.()

    if (!currentUser) {
      toast.error("Please sign in to like videos")
      return
    }

    if (isUpdating.current) return
    isUpdating.current = true

    const newLiked = !isLiked.value
    isLiked.value = newLiked
    likeCount.value = newLiked
      ? likeCount.value + 1
      : Math.max(0, likeCount.value - 1)

    try {
      if (supabase) {
        await supabase
          .from("video_likes")
          .upsert(
            { userid: currentUser.id, video_id: short.id, is_liked: newLiked },
            { onConflict: "userid,video_id" },
          )
      }
    } catch {
      isLiked.value = !newLiked
      likeCount.value = newLiked
        ? Math.max(0, likeCount.value - 1)
        : likeCount.value + 1
      toast.error("Failed to update like")
    } finally {
      isUpdating.current = false
    }
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
      <div className="flex flex-col items-center">
        <Button
          onClick={handleLike}
          variant="ghost"
          size="icon"
          className="rounded-full h-12 w-12 bg-white/20 hover:bg-white/30 backdrop-blur-sm"
        >
          <Heart className={`h-6 w-6 ${isLiked.value ? "fill-red-500 text-red-500" : "text-white"}`} />
        </Button>
        <span className="text-white text-xs mt-1 font-medium">{formatNumber(likeCount.value)}</span>
      </div>

      {/* Comment button */}
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