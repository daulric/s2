"use client"

import { useRef, useEffect } from "react"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Play, Pause, Volume2, VolumeX, Maximize, ThumbsUp,ThumbsDown, Share, MessageSquare, Clock, Bookmark, MoreHorizontal, Flame, Heart, Keyboard } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,} from "@/components/ui/dialog"
import { VideoCard } from "@/components/video-card"
import { useAuth } from "@/context/AuthProvider"
import { useSignals, useSignal } from "@preact/signals-react/runtime"
import upsert from "@/lib/supabase/upsert"
import Link from "next/link"
import { VideoInfoProps } from "@/lib/videos/data-to-video-format"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { BadgeCheckIcon } from "lucide-react"

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

export default function VideoPage({ videoData, public_videos }: { videoData: VideoInfoProps, public_videos: VideoInfoProps[] }) {
  useSignals();
  const { user: { user }, supabase } = useAuth();

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter();

  const subscribers = useSignal(0);
  const video_data_signal = useSignal<VideoInfoProps>();
  const total_likes = useSignal(0);
  const isLiked = useSignal(false);
  const isDisliked = useSignal(false);
  const isSubscribed = useSignal(false);
  const volume = useSignal(1);
  const isPlaying = useSignal(false);
  const duration = useSignal(0);
  const currentTime = useSignal(0);
  const isMuted = useSignal(false);
  const comment = useSignal("");
  const isSaved = useSignal(false);
  const showControls = useSignal(true);
  const isKeyboardShortcutsOpen = useSignal(false);
  const isFullscreen= useSignal(false);

  // Video Data
  const video_url = useSignal<string | null >(null);
  const thumbnail_url = useSignal<string | null>(null);

  async function getVideoBlobs() {
    return Promise.all([
      supabase.storage.from("videos").download(videoData.video_path || "").then(({ data }) => data ? URL.createObjectURL(data) : null),
      supabase.storage.from("images").download(videoData.thumbnail_path || "").then(({ data }) => data ? URL.createObjectURL(data) : null),
    ])
  }

  async function setIsSubscribe() {
    if (!user) return;

    const { data: subed } = await supabase
      .from("subscribers")
      .select("*")
      .eq("subscriber", user.id)
      .eq("vendor", videoData.creator_id)
      .single();
    
      if (subed) {
        isSubscribed.value = subed.is_subscribed;
      }
  }

  async function  getTotalSubs() {
    if (!videoData.creator_id) return;

    const { data: total_amount } = await supabase
      .from("subscribers")
      .select("*")
      .eq("vendor", videoData.creator_id)
      .eq("is_subscribed", true);

      if (total_amount) {
        subscribers.value = total_amount.length;
      }
  }

  async function getIsUserLikedVideo() {
    if (!user) return;

    const { data, error } = await supabase.from("video_likes")
      .select("*")
      .eq("userid", user.id)
      .eq("video_id", videoData.id)
      .single();

    if (error || !data) return;
    if (data.is_liked === true) {
      isLiked.value = true;
    } else if (data.is_liked === false) {
      isDisliked.value = true;
    }
  }

  async function getTotalLikes() {

    const { data, error } = await supabase.from("video_likes")
      .select("is_liked")
      .eq("video_id", videoData.id)
      .eq("is_liked", true);
    
    if (error) return;
    total_likes.value = data.length;
  }

  useEffect(() => {
    if (videoData) {
      video_data_signal.value = videoData;
      getVideoBlobs().then(([vid, thumb]) => {
        video_url.value = vid;
        thumbnail_url.value = thumb;
      })
    }

    return () => {
      if (video_url.value) {
        URL.revokeObjectURL(video_url.value)
      }

      if (thumbnail_url.value) {
        URL.revokeObjectURL(thumbnail_url.value)
      }
    }
  }, [videoData]);

  useEffect(() => {
    if (videoData) {
      getTotalLikes();
      getTotalSubs();
    }

    setIsSubscribe();
    getIsUserLikedVideo();

    return () => {
      subscribers.value = 0;
      total_likes.value = 0;
      isLiked.value = false;
      isDisliked.value = false;
      isSubscribed.value = false;
    }
  }, [user, videoData])

  // Effect to handle video play/pause
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying.value) {
        videoRef.current.play().catch((error) => {
          isPlaying.value = false;
          toast.error("Error playing video", {
            description: "The video could not be played. Please try again.",
          })
        })
      } else {
        videoRef.current.pause()
      }
    }
  }, [isPlaying.value])

  // Effect to handle video mute/unmute and volume
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted.value
      videoRef.current.volume = volume.value
    }
  }, [isMuted.value, volume.value])

  // Effect to set up keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {

      // Only handle keyboard shortcuts if not typing in an input or textarea
      if (
        document && document.activeElement && document.activeElement.tagName === "INPUT" ||
        document && document.activeElement && document.activeElement.tagName === "TEXTAREA") 
      {
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

    globalThis.addEventListener("keydown", handleKeyDown)
    

    return () => {
      globalThis.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  // Effect to auto-hide controls after inactivity
  useEffect(() => {
    const handleMouseMove = () => {
      showControls.value = true;

      // Clear any existing timeout
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }

      // Set a new timeout to hide controls after 3 seconds of inactivity
      controlsTimeoutRef.current = setTimeout(() => {
        if (isPlaying.value) {
          showControls.value = false;
        }
      }, 3000)
    }

    const playerElement = containerRef.current
    if (playerElement) {
      playerElement.addEventListener("mousemove", handleMouseMove)
      playerElement.addEventListener("mouseenter", handleMouseMove)
      playerElement.addEventListener("mouseleave", () => {
        if (isPlaying.value) {
          showControls.value = false;
        }
      })
    }

    return () => {
      if (playerElement) {
        playerElement.removeEventListener("mousemove", handleMouseMove)
        playerElement.removeEventListener("mouseenter", handleMouseMove)
        playerElement.removeEventListener("mouseleave", () => {
          if (isPlaying.value) {
            showControls.value = false;
          }
        })
      }

      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
    }
  }, [isPlaying.value])

  // Handle video metadata loaded
  const handleMetadataLoaded = () => {
    if (videoRef.current) {
      duration.value = videoRef.current.duration;
    }
  }

  // Handle time update
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      currentTime.value = videoRef.current.currentTime;
    }
  }

  // Format time in MM:SS format
  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds)) return "00:00"

    const minutes = Math.floor(timeInSeconds / 60)
    const seconds = Math.floor(timeInSeconds % 60)
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  const togglePlay = () => {
    isPlaying.value = !isPlaying.value;
  }

  const toggleMute = () => {
    isMuted.value = !isMuted.value;
  }

  const toggleFullscreen = () => {

    const container = containerRef.current;
    const video_player = videoRef.current;
    
    if (!container || !video_player) return;
    
    if (container.requestFullscreen) {
      if (!document.fullscreenElement) {
        container.requestFullscreen();
        isFullscreen.value = true;
      } else {
        document.exitFullscreen();
        isFullscreen.value = false
      }
    // @ts-ignore: webkitEnterFullscreen is not standard but used in some browsers (iOS Safari)
    } else if ((video_player as any).webkitEnterFullscreen) {
      // iOS Safari specific fullscreen API
      if (!isFullscreen.value) {
        // @ts-ignore
        (video_player as any).webkitEnterFullscreen();
        isFullscreen.value = true;
      } else {
        // @ts-ignore
        (video_player as any).webkitExitFullscreen();
        isFullscreen.value = false
      }
    }

  };

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
    if (isMuted.value) {
      isMuted.value = false;
    }

    volume.value = Math.min(1, volume.value + 0.1);
    // Show a visual indicator for volume change
    toast.info(`🔊 Volume: ${Math.round(volume.value * 100)}%`, { duration: 500 })
  }

  const decreaseVolume = () => {
    volume.value = Math.max(0, volume.value - 0.1);
    
    if (volume.value <= 0) {
      isMuted.value = true;
    }

    // Show a visual indicator for volume change
    toast.info(`Volume: ${Math.round((volume.value) * 100)}%`, { duration: 500 })
  }

  const handleLike = async () => {
    if (!user) {
      toast.error("Authentication Required", {
        description: "Please sign in to like videos",
        action: {
          label: "Sign In",
          onClick: () => router.push("/auth/login"),
        }
      })
      return
    }

    if (isLiked.value) {
      isLiked.value = false;
      total_likes.value = Math.max(0, total_likes.value - 1);
      await upsert(
        supabase,
        "video_likes",
        { video_id: videoData.id, userid: user.id}, 
        {  is_liked: null }
      )
    } else {
      isLiked.value = true;
      isDisliked.value = false;
      total_likes.value += 1;

      await upsert(
        supabase, 
        "video_likes", 
        { video_id: videoData.id,userid: user.id,}, 
        {  is_liked: true }
      )
    }
  }

  const handleDislike = async () => {
    if (!user) {
      toast.error("Authentication Required", {
        description: "Please sign in to dislike videos",
        action: {
          label: "Sign In",
          onClick: () => router.push("/auth/login"),
        },
      })
      return
    }

    if (isDisliked.value) {
      isDisliked.value = false
      await upsert(
        supabase, 
        "video_likes", 
        { video_id: videoData.id,userid: user.id,}, 
        { is_liked: null }
      )
    } else {
      isDisliked.value = true;
      isLiked.value = false;
      total_likes.value = Math.max(0, total_likes.value - 1);
      await upsert(
        supabase, 
        "video_likes", 
        { video_id: videoData.id,userid: user.id,}, 
        {  is_liked: false }
      )
    }
  }

  const handleSubscribe = async () => {
    if (!user) {
      toast.error("Authentication Required", {
        description: "Please sign in to subscribe to channels",
      })
      return
    }

    isSubscribed.value = !isSubscribed.value;

    await upsert(
      supabase,
      "subscribers",
      { vendor: videoData.creator_id, subscriber: user.id },
      { is_subscribed: isSubscribed.value }
    );

    if (isSubscribed.value) {
      toast.success(`Subscribed to ${videoData.username}`, {
        description: "You'll be notified about new uploads",
      })
    }

  }

  const handleSave = () => {
    if (!user) {
      toast.error("Authentication Required", {
        description: "Please sign in to save videos",
        action: {
          label: "Sign In",
          onClick: () => router.push("/auth/login"),
        }
      })
      return
    }

    isSaved.value = !isSaved.value;

    if (isSaved.value) {
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
    navigator.clipboard.writeText(globalThis.location.href)
    toast.success("Link copied to clipboard", {
      description: "Share this video with your friends",
    })
  }

  const handleCommentSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!user) {
      toast.error("Authentication Required", {
        description: "Please sign in to comment",
      })
      return
    }

    if (comment.value.trim()) {
      toast.success("Comment posted", {
        description: "Your comment has been added",
      })

      comment.value = "";
    }
  }

  const trending_vids = public_videos
    .sort((a, b) => ( b.views - a.views) )
    .filter((d) => d.id !== videoData.id)
    .slice(0, 4);

  const related_vids = public_videos
    .filter((d) => d.category === videoData.category)
    .map(d => ({ value: d, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({value}) => value)
    .filter((d) => d.id !== videoData.id)
    .slice(0, 4);
  
  const new_vids = public_videos
    .sort((a, b) => (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()))
    .filter(d => d.id !== videoData.id)
    .slice(0, 8);
  
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
                src={video_url.value ?? undefined}
                className="w-full h-full object-contain"
                poster={thumbnail_url.value ?? undefined}
                onLoadedMetadata={handleMetadataLoaded}
                onTimeUpdate={handleTimeUpdate}
                onClick={togglePlay}
                onEnded={() => { isPlaying.value = false }}
                onLoadedData={() => {
                  if (video_url.value) {
                    URL.revokeObjectURL(video_url.value)
                  }

                  if (thumbnail_url.value) {
                    URL.revokeObjectURL(thumbnail_url.value)
                  }

                }}
                playsInline
                preload="auto"
              />

              {/* Play button overlay - only show when paused */}
              {!isPlaying.value && (
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
                  showControls.value ? "opacity-100" : "opacity-0"
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
                  <div className="bg-primary h-full" style={{ width: `${(currentTime.value / duration.value) * 100 || 0}%` }}></div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button onClick={togglePlay} variant="ghost" size="icon" className="text-white">
                            {isPlaying.value ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">{isPlaying.value ? "Pause (Space)" : "Play (Space)"}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button onClick={toggleMute} variant="ghost" size="icon" className="text-white">
                            {isMuted.value ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">{isMuted.value ? "Unmute (M)" : "Mute (M)"}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <div className="text-white text-xs">
                      {formatTime(currentTime.value)} / {formatTime(duration.value)}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Dialog open={isKeyboardShortcutsOpen.value} onOpenChange={() => isKeyboardShortcutsOpen.value = !isKeyboardShortcutsOpen.value}>
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
                  variant={isLiked.value ? "default" : "ghost"}
                  size="sm"
                  className="flex items-center"
                  onClick={handleLike}
                >
                  <ThumbsUp className={ `h-4 w-4 mr-1 ${isLiked.value ? "fill-current" : ""}` }/>
                  {total_likes}
                </Button>
                <Button
                  variant={isDisliked.value ? "default": "ghost"}
                  size="sm"
                  className="flex items-center"
                  onClick={handleDislike}
                >
                  <ThumbsDown className={`h-4 w-4 mr-1 ${isDisliked.value ? "fill-current" : ""}`} />
                  Dislike
                </Button>
                <Button variant="ghost" size="sm" className="flex items-center" onClick={handleShare}>
                  <Share className="h-4 w-4 mr-1" />
                  Share
                </Button>
                <Button
                  variant={isSaved.value ? "default" : "ghost"}
                  size="sm"
                  className="flex items-center"
                  onClick={handleSave}
                >
                  <Clock className={`h-4 w-4 mr-1 ${isSaved.value ? "fill-current" : ""}`} />
                  {isSaved.value ? "Saved" : "Save"}
                </Button>
              </div>
            </div>

            <Separator className="my-4" />

            {/* Creator Info */}
              <div className="flex items-start space-x-4">
                <Link href={`/user/${videoData.creator_id}`} >
                  <Avatar className="h-12 w-12">
                    <AvatarImage
                      src={video_data_signal.value?.avatar_url || `${process.env.NEXT_PUBLIC_PROFILE}${videoData.username}`}
                      alt={video_data_signal.value?.username}
                      />
                    <AvatarFallback>{video_data_signal.value?.username?.[0]}</AvatarFallback>
                  </Avatar>
                </Link>
                <div className="flex-1">
                  <Link href={`/user/${videoData.creator_id}`}><h3 className="font-semibold flex items-center gap-2">
                    {videoData.username}
                    {videoData.is_verified && (
                      <Badge
                        variant="secondary"
                        className="bg-blue-500 text-white dark:bg-blue-600 flex items-center gap-1"
                      >
                        <BadgeCheckIcon className="w-4 h-4" />
                        Verified
                      </Badge>
                    )}
                    </h3></Link>
                  <p className="text-sm text-muted-foreground">{subscribers.value || 0} subscribers</p>
                  <p className="mt-2 text-sm">{videoData.description}</p>
                </div>
                {(user && user.id !== videoData.creator_id) && (
                  <Button variant={ isSubscribed.value ? "outline" : "default" } onClick={handleSubscribe}>
                    { isSubscribed.value ? "Subscribed" : "Subscribe" }
                  </Button>
                )}
              </div>

            <Separator className="my-6" />

            {/*

            {Comment Section}
              <div>
              <h3 className="font-semibold flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                {videoData?.comments?.length || 0} Comments
              </h3>

              <form onSubmit={handleCommentSubmit} className="mt-4 flex items-start space-x-4">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{user ? user.email?.charAt(0).toUpperCase() || "U" : "G"}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Textarea
                    placeholder="Add a comment..."
                    value={comment.value}
                    onChange={(e) => { comment.value = e.target.value } }
                    className="resize-none"
                  />
                  <div className="flex justify-end mt-2 space-x-2">
                    <Button type="button" variant="ghost" onClick={() => { comment.value = "" }}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={!comment.value.trim()}>
                      Comment
                    </Button>
                  </div>
                </div>
              </form>

              {Comment List}
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
            
            */}

          </div>
        </div>

        {/* Video Recommendations */}
        <div className="mt-12">
          <Tabs defaultValue="trending" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="trending">
                <Flame className="h-4 w-4 mr-2" />
                Trending
              </TabsTrigger>
              <TabsTrigger value="new">
                <Clock className="h-4 w-4 mr-2" />
                New
              </TabsTrigger>
            </TabsList>

            <TabsContent value="trending" className="mt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {trending_vids.map((video) => (
                  <VideoCard key={video.id} video={video} supabase={supabase}/>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="new" className="mt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {new_vids.map((video) => (
                  <VideoCard key={video.id} video={video} supabase={supabase}/>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  )
}