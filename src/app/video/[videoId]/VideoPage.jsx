"use client"

import { useState, useRef, useEffect } from "react"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  ThumbsUp,
  ThumbsDown,
  Share,
  MessageSquare,
  Clock,
  Bookmark,
  MoreHorizontal,
  Flame,
  Heart,
  Keyboard,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { VideoCard } from "@/components/video-card"
import { useAuth } from "@/context/AuthProvider"
import { useSignal, useComputed } from "@preact/signals-react"
import upsert from "@/lib/supabase/upsert"

// Keyboard shortcuts help data
const keyboardShortcuts = [
  { key: "Space", action: "Play/Pause" },
  { key: "K", action: "Play/Pause (alternative)" },
  { key: "M", action: "Mute/Unmute" },
  { key: "F", action: "Fullscreen" },
  { key: "Esc", action: "Exit Fullscreen" },
  { key: "→", action: "Forward 10 seconds" },
  { key: "←", action: "Rewind 10 seconds" },
  { key: "↑", action: "Volume Up" },
  { key: "↓", action: "Volume Down" },
  { key: "0-9", action: "Jump to 0-90% of video" },
  { key: "J", action: "Rewind 10 seconds" },
  { key: "L", action: "Forward 10 seconds" },
]

export default function VideoPage({ videoData, public_videos }) {
  const { user: { user }, supabase } = useAuth()

  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [comment, setComment] = useState("")
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [isDisliked, setIsDisliked] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const [isKeyboardShortcutsOpen, setIsKeyboardShortcutsOpen] = useState(false)
  const videoRef = useRef(null)
  const containerRef = useRef(null)
  const controlsTimeoutRef = useRef(null)

  const subscribers = useSignal(0);
  const video_data_signal = useSignal(0);

  async function setIsSubscribe() {
    if (!user) return;

    const { data: subed } = await supabase
      .from("subscribers")
      .select("*")
      .eq("subscriber", user.id)
      .eq("vendor", videoData.creator_id)
      .single();
    
      if (subed) {
        setIsSubscribed(subed.is_subscribed);
      }
  }

  async function  getTotalSubs() {
    if (!user) return;
    if (!videoData.creator_id) return;

    const { data: total_amount } = await supabase
      .from("subscribers")
      .select("*")
      .eq("vendor", videoData.creator_id)
      .eq("is_subscribed", true);

    subscribers.value = total_amount.length;
  }

  useEffect(() => {
    setIsSubscribe();
    getTotalSubs();
  }, [user])

  useEffect(() => {
    if (videoData) {
      video_data_signal.value = videoData;
    }
  }, [videoData]);

  // Effect to handle video play/pause
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch((error) => {
          console.error("Error playing video:", error)
          setIsPlaying(false)
          toast.error("Error playing video", {
            description: "The video could not be played. Please try again.",
          })
        })
      } else {
        videoRef.current.pause()
      }
    }
  }, [isPlaying])

  // Effect to handle video mute/unmute and volume
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted
      videoRef.current.volume = volume
    }
  }, [isMuted, volume])

  // Effect to set up keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only handle keyboard shortcuts if not typing in an input or textarea
      if (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA") {
        return
      }

      // Prevent default behavior for these keys to avoid scrolling the page
      if (
        [" ", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "f", "m", "k", "j", "l"].includes(e.key.toLowerCase())
      ) {
        e.preventDefault()
      }

      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          togglePlay()
          break
        case "m":
          toggleMute()
          break
        case "f":
          toggleFullscreen()
          break
        case "arrowleft":
        case "j":
          seekBackward()
          break
        case "arrowright":
        case "l":
          seekForward()
          break
        case "arrowup":
          increaseVolume()
          break
        case "arrowdown":
          decreaseVolume()
          break
        default:
          // Number keys 0-9 to jump to percentage of video
          const num = Number.parseInt(e.key, 10)
          if (!isNaN(num) && num >= 0 && num <= 9) {
            if (videoRef.current) {
              const seekTime = (videoRef.current.duration * num) / 10
              videoRef.current.currentTime = seekTime
            }
          }
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  // Effect to auto-hide controls after inactivity
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true)

      // Clear any existing timeout
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }

      // Set a new timeout to hide controls after 3 seconds of inactivity
      controlsTimeoutRef.current = setTimeout(() => {
        if (isPlaying) {
          setShowControls(false)
        }
      }, 3000)
    }

    const playerElement = containerRef.current
    if (playerElement) {
      playerElement.addEventListener("mousemove", handleMouseMove)
      playerElement.addEventListener("mouseenter", handleMouseMove)
      playerElement.addEventListener("mouseleave", () => {
        if (isPlaying) {
          setShowControls(false)
        }
      })
    }

    return () => {
      if (playerElement) {
        playerElement.removeEventListener("mousemove", handleMouseMove)
        playerElement.removeEventListener("mouseenter", handleMouseMove)
        playerElement.removeEventListener("mouseleave", () => {
          if (isPlaying) {
            setShowControls(false)
          }
        })
      }

      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
    }
  }, [isPlaying])

  // Handle video metadata loaded
  const handleMetadataLoaded = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
    }
  }

  // Handle time update
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  // Format time in MM:SS format
  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds)) return "00:00"

    const minutes = Math.floor(timeInSeconds / 60)
    const seconds = Math.floor(timeInSeconds % 60)
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  const togglePlay = () => {
    setIsPlaying(!isPlaying)
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  const toggleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen()
      } else {
        containerRef.current.requestFullscreen()
      }
    }
  }

  const seekBackward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10)

      // Show a visual indicator for seeking backward
      toast.info("⏪ -10 seconds", { duration: 1000 })
    }
  }

  const seekForward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 10)

      // Show a visual indicator for seeking forward
      toast.info("⏩ +10 seconds", { duration: 1000 })
    }
  }

  const increaseVolume = () => {
    if (isMuted) {
      setIsMuted(false)
    }
    setVolume((prev) => Math.min(1, prev + 0.1))

    // Show a visual indicator for volume change
    toast.info(`🔊 Volume: ${Math.round((volume + 0.1) * 100)}%`, { duration: 1000 })
  }

  const decreaseVolume = () => {
    setVolume((prev) => Math.max(0, prev - 0.1))
    if (volume - 0.1 <= 0) {
      setIsMuted(true)
    }

    // Show a visual indicator for volume change
    toast.info(`🔉 Volume: ${Math.round((volume - 0.1) * 100)}%`, { duration: 1000 })
  }

  const handleLike = () => {
    if (!user) {
      toast.error("Authentication required", {
        description: "Please sign in to like videos",
      })
      return
    }

    if (isLiked) {
      setIsLiked(false)
    } else {
      setIsLiked(true)
      setIsDisliked(false)
    }
  }

  const handleDislike = () => {
    if (!user) {
      toast.error("Authentication required", {
        description: "Please sign in to dislike videos",
      })
      return
    }

    if (isDisliked) {
      setIsDisliked(false)
    } else {
      setIsDisliked(true)
      setIsLiked(false)
    }
  }

  const handleSubscribe = async () => {
    if (!user) {
      toast.error("Authentication required", {
        description: "Please sign in to subscribe to channels",
      })
      return
    }

    setIsSubscribed(prev => !prev);

    await upsert(
      supabase,
      "subscribers",
      { vendor: videoData.creator_id, subscriber: user.id },
      { is_subscribed: !isSubscribed }
    );

    if (!isSubscribed) {
      toast.success(`Subscribed to ${videoData.username}`, {
        description: "You'll be notified about new uploads",
      })
    }

  }

  const handleSave = () => {
    if (!user) {
      toast.error("Authentication required", {
        description: "Please sign in to save videos",
      })
      return
    }

    setIsSaved(!isSaved)
    if (!isSaved) {
      toast.success("Video saved", {
        description: "Added to your Watch Later playlist",
      })
    } else {
      toast.success("Video removed", {
        description: "Removed from your Watch Later playlist",
      })
    }
  }

  const handleShare = () => {
    // In a real app, this would open a share dialog
    navigator.clipboard.writeText(window.location.href)
    toast.success("Link copied to clipboard", {
      description: "Share this video with your friends",
    })
  }

  const handleCommentSubmit = (e) => {
    e.preventDefault()

    if (!user) {
      toast.error("Authentication required", {
        description: "Please sign in to comment",
      })
      return
    }

    if (comment.trim()) {
      toast.success("Comment posted", {
        description: "Your comment has been added",
      })
      setComment("")
    }
  }

  const trending_vids = [...public_videos]
    .sort((a, b) => ( b.views - a.views) )
    .filter((d) => d.id !== videoData.id)
    .slice(0, 4);

  const related_vids = [...public_videos]
    .filter((d) => d.category === videoData.category)
    .map(d => ({ value: d, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({value}) => value)
    .filter((d) => d.id !== videoData.id)
    .slice(0, 4);
  
  const new_vids = [...public_videos]
    .sort((a, b) => ( (new Date(a.created_at)) - (new Date(b.created_at)) ) )
    .filter(d => d.id !== videoData.id)
    .slice(0, 12);
  
  return (
    <main className="min-h-screen pt-5 p-4 bg-background">
      <div className="max-w-6xl mx-auto">
        {/* Video Player Section */}
        <div className="mb-8">
          <div
            className="relative bg-black rounded-lg overflow-hidden"
            ref={containerRef}
            onDoubleClick={toggleFullscreen}
          >
            <div className="aspect-video flex items-center justify-center">
              <video
                ref={videoRef}
                src={videoData.video}
                className="w-full h-full object-contain"
                poster={videoData.thumbnail}
                onLoadedMetadata={handleMetadataLoaded}
                onTimeUpdate={handleTimeUpdate}
                onClick={togglePlay}
                onEnded={() => setIsPlaying(false)}
                playsInline
                preload="auto"
              />

              {/* Play button overlay - only show when paused */}
              {!isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Button
                    onClick={togglePlay}
                    variant="secondary"
                    size="icon"
                    className="rounded-full h-16 w-16 bg-black/50 hover:bg-black/70"
                  >
                    <Play className="h-8 w-8" />
                  </Button>
                </div>
              )}

              {/* Video controls - show based on showControls state */}
              <div
                className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${
                  showControls ? "opacity-100" : "opacity-0"
                }`}
              >
                {/* Progress bar */}
                <div
                  className="w-full bg-gray-600 h-2 mb-2 rounded-full overflow-hidden cursor-pointer"
                  onClick={(e) => {
                    if (videoRef.current) {
                      const rect = e.currentTarget.getBoundingClientRect()
                      const pos = (e.clientX - rect.left) / rect.width
                      videoRef.current.currentTime = pos * videoRef.current.duration
                    }
                  }}
                >
                  <div className="bg-primary h-full" style={{ width: `${(currentTime / duration) * 100 || 0}%` }}></div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button onClick={togglePlay} variant="ghost" size="icon" className="text-white">
                            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">{isPlaying ? "Pause (Space)" : "Play (Space)"}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button onClick={toggleMute} variant="ghost" size="icon" className="text-white">
                            {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">{isMuted ? "Unmute (M)" : "Mute (M)"}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <div className="text-white text-xs">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Dialog open={isKeyboardShortcutsOpen} onOpenChange={setIsKeyboardShortcutsOpen}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-white">
                          <Keyboard className="h-5 w-5" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Keyboard Shortcuts</DialogTitle>
                          <DialogDescription>
                            Use these keyboard shortcuts to control the video player
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-2 gap-4 py-4">
                          {keyboardShortcuts.map((shortcut, index) => (
                            <div key={index} className="flex justify-between">
                              <span className="font-medium">{shortcut.key}</span>
                              <span className="text-muted-foreground">{shortcut.action}</span>
                            </div>
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button onClick={toggleFullscreen} variant="ghost" size="icon" className="text-white">
                            <Maximize className="h-5 w-5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">Fullscreen (F)</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Video Info */}
          <div className="mt-4">
            <h1 className="text-2xl font-bold">{videoData.title}</h1>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-2 text-sm text-muted-foreground">
              <div>
                {videoData.views} views •{" "}
                {videoData.uploadDate}
              </div>
              <div className="flex items-center space-x-2 mt-2 sm:mt-0">
                <Button
                  variant={isLiked ? "default" : "ghost"}
                  size="sm"
                  className="flex items-center"
                  onClick={handleLike}
                >
                  <ThumbsUp className={`h-4 w-4 mr-1 ${isLiked ? "fill-current" : ""}`} />
                  {videoData.likes || 0}
                </Button>
                <Button
                  variant={isDisliked ? "default" : "ghost"}
                  size="sm"
                  className="flex items-center"
                  onClick={handleDislike}
                >
                  <ThumbsDown className={`h-4 w-4 mr-1 ${isDisliked ? "fill-current" : ""}`} />
                  Dislike
                </Button>
                <Button variant="ghost" size="sm" className="flex items-center" onClick={handleShare}>
                  <Share className="h-4 w-4 mr-1" />
                  Share
                </Button>
                <Button
                  variant={isSaved ? "default" : "ghost"}
                  size="sm"
                  className="flex items-center"
                  onClick={handleSave}
                >
                  <Clock className={`h-4 w-4 mr-1 ${isSaved ? "fill-current" : ""}`} />
                  {isSaved ? "Saved" : "Save"}
                </Button>
                <Button variant="ghost" size="sm" className="flex items-center">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator className="my-4" />

            {/* Creator Info */}
            <div className="flex items-start space-x-4">
              <Avatar className="h-12 w-12">
                <AvatarImage
                  src={useComputed(() => video_data_signal.value.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${videoData.username}`)}
                  alt={useComputed(() => video_data_signal.value.username)}
                />
                <AvatarFallback>{useComputed(() => video_data_signal.value.username?.[0])}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-semibold">{videoData.username}</h3>
                <p className="text-sm text-muted-foreground">{useComputed(() => subscribers.value) || 0} subscribers</p>
                <p className="mt-2 text-sm">{videoData.description}</p>
              </div>
              {(user && user.id !== videoData.creator_id) && (
                <Button variant={isSubscribed ? "outline" : "default"} onClick={handleSubscribe}>
                  {isSubscribed ? "Subscribed" : "Subscribe"}
                </Button>
              )}
            </div>

            <Separator className="my-6" />

            {/* Comments */}
            <div>
              <h3 className="font-semibold flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                {videoData?.comments?.length || 0} Comments
              </h3>

              {/* Comment Form */}
              <form onSubmit={handleCommentSubmit} className="mt-4 flex items-start space-x-4">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{user ? user.email?.charAt(0).toUpperCase() || "U" : "G"}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Textarea
                    placeholder="Add a comment..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="resize-none"
                  />
                  <div className="flex justify-end mt-2 space-x-2">
                    <Button type="button" variant="ghost" onClick={() => setComment("")}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={!comment.trim()}>
                      Comment
                    </Button>
                  </div>
                </div>
              </form>

              {/* Comment List */}
              <div className="mt-6 space-y-6">
                {(videoData.comments || []).map((comment, index) => (
                  <div key={comment.id || index} className="flex space-x-4">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={comment?.avatar } alt={comment.user} />
                      <AvatarFallback>{comment.user?.[0] || "U"}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center">
                        <span className="font-medium">{comment.user}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{comment.time}</span>
                      </div>
                      <p className="mt-1 text-sm">{comment.text}</p>
                      <div className="mt-2 flex items-center space-x-4 text-sm">
                        <Button variant="ghost" size="sm" className="h-auto py-0">
                          <ThumbsUp className="h-3.5 w-3.5 mr-1" />
                          {comment.likes || 0}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-auto py-0">
                          <ThumbsDown className="h-3.5 w-3.5 mr-1" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-auto py-0">
                          Reply
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Video Recommendations */}
        <div className="mt-12">
          <Tabs defaultValue="related" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="related">
                <Bookmark className="h-4 w-4 mr-2" />
                Related
              </TabsTrigger>
              <TabsTrigger value="trending">
                <Flame className="h-4 w-4 mr-2" />
                Trending
              </TabsTrigger>
              <TabsTrigger value="new">
                <Clock className="h-4 w-4 mr-2" />
                New
              </TabsTrigger>
            </TabsList>

            <TabsContent value="related" className="mt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {related_vids.map((video) => (
                  <VideoCard key={video.id} video={video} quick_load />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="trending" className="mt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {trending_vids.map((video) => (
                  <VideoCard key={video.id} video={video} quick_load/>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="new" className="mt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {new_vids.map((video) => (
                  <VideoCard key={video.id} video={video} quick_load />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  )
}