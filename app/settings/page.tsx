"use client"

import type React from "react"

import { useEffect, useCallback } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Mail, Calendar, Camera, Edit3, Save, X, Video, Eye, ThumbsUp, Users, AlertTriangle, Music } from "lucide-react"
import { useAuth } from "@/context/AuthProvider"
import { VideoCard } from "@/components/video-card"
import { VideoEditDialog } from "@/components/video-edit-dialog"
import { MusicEditDialog } from "@/components/music-edit-dialog"
import { MediaManageCard } from "@/components/media-manage-card"
import { useSignal } from "@preact/signals-react"
import Link from "next/link"
import converttovideoformat, { type VideoData, type VideoInfoProps } from "@/lib/videos/data-to-video-format"
import convertToAudio, { type AudioData, type AudioInfoProps } from "@/lib/audios/data-to-audio-format"
import { useSignals } from "@preact/signals-react/runtime"
import { useRouter } from "next/navigation"
import { deleteAccount } from "./user-management"
import { useWebHaptics } from "web-haptics/react"
import { updateAudioDetails } from "@/serverActions/GetAudioDetails"

interface VideoWithLikes extends VideoData {
  video_likes: { is_liked: boolean; videos?: VideoData }[]
}

interface VideoLikes {
  is_liked: boolean
  videos?: VideoData
}

export default function ProfilePage() {
  useSignals()
  const { trigger } = useWebHaptics({debug: process.env.NODE_ENV !== "production"});
  const {
    user: { user },
    supabase,
  } = useAuth()
  const router = useRouter()
  const isEditing = useSignal(false)
  const isLoading = useSignal(false)
  const isDeleteDialogOpen = useSignal(false)
  const isDeleting = useSignal(false)
  const deleteConfirmation = useSignal("")
  const profileData = useSignal({
    id: "",
    username: "",
    email: "",
    description: "",
    created_at: "",
    avatar_url: "",
  })

  const editingVideo = useSignal(null)
  const isVideoEditOpen = useSignal(false)

  // Signals
  const subscribers = useSignal(0)
  const views = useSignal(0)
  const total_video_count = useSignal(0)
  const total_likes = useSignal(0)
  const total_liked_videos = useSignal<VideoInfoProps[]>([])
  const user_videos = useSignal<VideoInfoProps[]>([])
  const user_audios = useSignal<AudioInfoProps[]>([])

  const loadProfile = useCallback(async () => {
    if (!user) return
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single()

      if (error && error.code !== "PGRST116") {
        throw error
      }

      if (data) {
        profileData.value = {
          ...profileData.value,
          id: user.id,
          username: data.username || "",
          email: user.email || "",
          description: data.description || "",
          created_at: new Date(user.created_at).toLocaleDateString("en-GB"),
          avatar_url: data.avatar_url || "",
        }
      } else {
        // Create profile if it doesn't exist
        profileData.value = {
          ...profileData.value,
          id: user.id,
          username: "",
          email: user.email || "",
          description: "",
          created_at: new Date(user.created_at).toLocaleDateString("en-GB"),
          avatar_url: "",
        }
      }
    } catch (error) {
      toast.error("Failed to load profile", {
        description: "Please try refreshing the page",
      })
    }
  }, [user, supabase, profileData])

  const load_subs = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase.from("subscribers").select("*").eq("vendor", user.id)

    if (error) return
    subscribers.value = data.length
  }, [user, supabase, subscribers])

  const load_videos = useCallback(async () => {
    if (!user) return

    const { data, error } = await supabase.from("videos").select("*, video_likes(is_liked)").eq("userid", user.id)

    if (error || !data) return

    let view_count = 0

    data.map(async (i: VideoData) => {
      if (i.views) view_count += i.views

      const video = await converttovideoformat(supabase, i, 120)

      if (!user_videos.value.some((item) => item.id === video.id)) {
        user_videos.value = [...user_videos.value, video]
      }
    })

    const totalLikesCount: number =
      data?.reduce(
        (total: number, video: VideoWithLikes) =>
          total + video.video_likes.filter((like) => like.is_liked === true).length,
        0,
      ) || 0

    views.value = view_count
    total_likes.value = totalLikesCount
    total_video_count.value = data.length
  }, [user, supabase, user_videos, total_likes, views, total_video_count])

  const load_liked_video = useCallback(async () => {
    if (!user) return

    const { data, error } = await supabase
      .from("video_likes")
      .select("*, videos(*)")
      .eq("userid", user.id)
      .eq("is_liked", true)

    if (error) return
    data.map(async (i: VideoLikes) => {
      if (!i.videos) return

      const contered = await converttovideoformat(supabase, i.videos, 120)
      if (!total_liked_videos.value.find((i) => i.id === contered.id)) {
        total_liked_videos.value = [...total_liked_videos.value, contered]
      }
    })
  }, [user, supabase, total_liked_videos])

  const editingAudio = useSignal<AudioInfoProps | null>(null)
  const isAudioEditOpen = useSignal(false)

  const load_audios = useCallback(async () => {
    if (!user) return

    const { data, error } = await supabase.from("audios").select("*").eq("userid", user.id)
    if (error || !data) return

    const audios = await Promise.all(data.map((audio: AudioData) => convertToAudio(supabase, audio, 120)))
    user_audios.value = audios
  }, [user, supabase, user_audios])

  useEffect(() => {
    if (user) {
      document.title = "s2 - Settings"
      // Load user profile data
      loadProfile()
      load_subs()
      load_videos()
      load_liked_video()
      load_audios()
      return
    } else {
      document.title = "s2 - 401"
    }

    return () => {
      user_videos.value = []
      user_audios.value = []
      total_liked_videos.value = []
      total_likes.value = 0
      total_video_count.value = 0
      subscribers.value = 0
      views.value = 0
    }
  }, [user, loadProfile, load_subs, load_videos, load_liked_video, load_audios, user_videos, user_audios, total_liked_videos, total_likes, total_video_count, subscribers, views])

  const handleSaveProfile = async () => {
    if (!user) return

    isLoading.value = true
    try {
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        username: profileData.value.username,
        description: profileData.value.description,
        avatar_url: profileData.value.avatar_url,
      })

      if (error) throw error

      isEditing.value = false
      toast.success("Profile updated", {
        description: "Your profile has been saved successfully",
      })
      trigger("success");
    } catch (error) {
      toast.error("Failed to save profile", {
        description: "Please try again",
      })
      trigger("error");
    } finally {
      isLoading.value = false
    }
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large", {
        description: "Please choose an image under 5MB",
      })
      return
    }

    isLoading.value = true
    try {
      const fileExt = file.name.split(".").pop()
      const fileName = `${user.id}-${Math.random()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file)

      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath)

      profileData.value = { ...profileData.value, avatar_url: publicUrl }

      toast.success("Avatar uploaded", {
        description: "Don't forget to save your profile",
      })
      trigger("success");
    } catch (error) {
      toast.error("Failed to upload avatar", {
        description: "Please try again",
      })
      trigger("error");
    } finally {
      isLoading.value = false
    }
  }

  const handleEditVideo = (video: any) => {
    editingVideo.value = { ...video }
    isVideoEditOpen.value = true
    trigger("light");
  }

  const handleSaveVideo = async (updatedVideo: any) => {
    const { error } = await supabase.from("videos").update(updatedVideo).eq("video_id", updatedVideo.video_id)

    if (error) {
      toast.error("Details Upload Error", {
        description: typeof error === "string" ? error : error?.message || String(error),
      })
      trigger("error");
    }

    trigger("success");
    editingVideo.value = null
  }

  const handleEditAudio = (audio: AudioInfoProps) => {
    editingAudio.value = { ...audio }
    isAudioEditOpen.value = true
    trigger("light")
  }

  const handleSaveAudio = async (updatedAudio: AudioData) => {
    const payload = {
      title: updatedAudio.title,
      description: updatedAudio.description || "",
      visibility: updatedAudio.visibility,
      thumbnail_path: updatedAudio.thumbnail_path ?? null,
    }

    await updateAudioDetails(updatedAudio.audio_id, payload)

    await load_audios()

    editingAudio.value = null
    isAudioEditOpen.value = false
    trigger("success")
  }

  const handleDeleteAccount = async () => {
    isDeleting.value = true
    try {

      deleteAccount(deleteConfirmation.value)
        .then((res) => {
          if (res.success) {
            toast.success(res.message, {
              description: "Your account has been deleted successfully",
            })
            trigger("success");

            router.push("/")
          } else {
            throw new Error(res.message)
          }
        })
        .catch((error) => {
          toast.error("Failed to delete account", {
            description: error.message || "Please try again or contact support",
          })
        })
    } catch (error) {
      toast.error("Failed to delete account", {
        description: "Please try again or contact support",
      })
      trigger("error");
    } finally {
      isDeleting.value = false
      isDeleteDialogOpen.value = false
      deleteConfirmation.value = ""
    }
  }

  if (!user) {
    return null
  }

  return (
    <main className="min-h-screen pt-20 p-4 bg-background">
      <div className="max-w-6xl mx-auto">
        {/* Profile Header */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24 sm:h-32 sm:w-32">
                  <AvatarImage
                    src={
                      profileData.value.avatar_url ||
                      `${process.env.NEXT_PUBLIC_PROFILE || "/placeholder.svg"}${profileData.value.username || user.email}`
                    }
                    alt={profileData.value.username || "User"}
                  />
                  <AvatarFallback className="text-2xl">
                    {(profileData.value.username || user.email || "G").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {isEditing.value && (
                  <label className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground rounded-full p-2 cursor-pointer hover:bg-primary/90 transition-colors">
                    <Camera className="h-4 w-4" />
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                  </label>
                )}
              </div>

              <div className="flex-1">
                {isEditing.value ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={profileData.value.username}
                        onChange={(e) => {
                          profileData.value = { ...profileData.value, username: e.target.value }
                        }}
                        placeholder="Enter your username"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={profileData.value.description}
                        onChange={(e) => {
                          profileData.value = { ...profileData.value, description: e.target.value }
                        }}
                        placeholder="Tell us about yourself..."
                        rows={3}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <h1 className="text-3xl font-bold">{profileData.value.username || "Set your username"}</h1>
                    <p className="text-muted-foreground mt-2">{profileData.value.description || "No bio added yet"}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {isEditing.value ? (
                  <>
                    <Button onClick={handleSaveProfile} disabled={isLoading.value}>
                      <Save className="h-4 w-4 mr-2" />
                      {isLoading.value ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        isEditing.value = false
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => {
                      isEditing.value = true
                    }}
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          {!isEditing.value && (
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {profileData.value.email}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Joined {profileData.value.created_at}
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Video className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{total_video_count.value}</p>
                  <p className="text-sm text-muted-foreground">Videos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{views.value}</p>
                  <p className="text-sm text-muted-foreground">Total Views</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <ThumbsUp className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{total_likes.value}</p>
                  <p className="text-sm text-muted-foreground">Total Likes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{subscribers.value}</p>
                  <p className="text-sm text-muted-foreground">Subscribers</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="videos" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="videos">My Videos</TabsTrigger>
            <TabsTrigger value="audio">My Audio</TabsTrigger>
            <TabsTrigger value="liked">Liked Videos</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="videos" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Your Videos</CardTitle>
                <CardDescription>Manage your uploaded videos</CardDescription>
              </CardHeader>
              <CardContent>
                {user_videos.value !== null && user_videos.value.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {user_videos.value?.map((video) => (
                      <MediaManageCard key={video.id} onEdit={() => handleEditVideo(video)}>
                        <VideoCard key={video.id} video={video} compact supabase={supabase} />
                      </MediaManageCard>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No videos yet</h3>
                    <p className="text-muted-foreground mb-4">Start creating content by uploading your first video</p>
                    <Button>
                      <Link href="/upload">Upload Video</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="liked" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Liked Videos</CardTitle>
                <CardDescription>Videos you&apos;ve liked</CardDescription>
              </CardHeader>
              <CardContent>
                {total_liked_videos.value.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {total_liked_videos.value.map((video) => (
                      <VideoCard key={video.id} video={video} compact supabase={supabase} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <ThumbsUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No liked videos</h3>
                    <p className="text-muted-foreground">Videos you like will appear here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audio" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Your Audio</CardTitle>
                <CardDescription>Manage your uploaded tracks and privacy settings</CardDescription>
              </CardHeader>
              <CardContent>
                {user_audios.value.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {user_audios.value.map((audio) => (
                      <MediaManageCard key={audio.id} onEdit={() => handleEditAudio(audio)}>
                        <Card className="border-muted">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3 min-w-0 pr-10">
                              <div className="h-12 w-12 rounded-md overflow-hidden bg-muted shrink-0">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={audio.thumbnail} alt={audio.title} className="h-full w-full object-cover" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium truncate">{audio.title}</p>
                                <p className="text-sm text-muted-foreground truncate">{audio.description || "No description"}</p>
                                <p className="text-xs text-muted-foreground mt-2">
                                  {audio.listens?.toLocaleString() || 0} listens · {audio.visibility || "public"}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </MediaManageCard>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No tracks yet</h3>
                    <p className="text-muted-foreground mb-4">Upload your first song to start building your catalog</p>
                    <Button>
                      <Link href="/upload/music">Upload Music</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>Manage your account preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Privacy Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Profile Visibility</p>
                        <p className="text-sm text-muted-foreground">Make your profile visible to other users</p>
                      </div>
                      <Badge variant="secondary">Public</Badge>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Video Comments</p>
                        <p className="text-sm text-muted-foreground">Allow others to comment on your videos</p>
                      </div>
                      <Badge variant="secondary">Enabled</Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-4 text-destructive">Danger Zone</h3>
                  <div className="space-y-4">
                    <Dialog
                      open={isDeleteDialogOpen.value}
                      onOpenChange={(open) => {
                        isDeleteDialogOpen.value = open
                      }}
                    >
                      <DialogTrigger>
                        <Button variant="destructive" className="w-full sm:w-auto">
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Delete Account
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            Delete Account
                          </DialogTitle>
                          <DialogDescription className="text-left">
                            This action cannot be undone. This will permanently delete your account, all your videos,
                            comments, likes, and all associated data.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="delete-confirmation" className="text-sm font-medium">
                              Type <span className="font-bold text-destructive">DELETE</span> to confirm:
                            </Label>
                            <Input
                              id="delete-confirmation"
                              value={deleteConfirmation.value}
                              onChange={(e) => {
                                deleteConfirmation.value = e.target.value
                              }}
                              placeholder="Type DELETE here"
                              className="mt-2"
                            />
                          </div>
                          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                            <p className="text-sm text-destructive font-medium">What will be deleted:</p>
                            <ul className="text-sm text-destructive/80 mt-1 space-y-1">
                              <li>• Your profile and account information</li>
                              <li>• All uploaded videos and thumbnails</li>
                              <li>• All comments and likes</li>
                              <li>• All subscriptions and followers</li>
                              <li>• All saved videos and playlists</li>
                            </ul>
                          </div>
                        </div>
                        <DialogFooter className="flex-col sm:flex-row gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              isDeleteDialogOpen.value = false
                              deleteConfirmation.value = ""
                            }}
                            disabled={isDeleting.value}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={handleDeleteAccount}
                            disabled={deleteConfirmation.value !== "DELETE" || isDeleting.value}
                          >
                            {isDeleting.value ? "Deleting..." : "Delete Account Permanently"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <p className="text-sm text-muted-foreground">
                      This action cannot be undone. This will permanently delete your account and all associated data.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        <VideoEditDialog
          video={editingVideo.value}
          isOpen={isVideoEditOpen.value}
          onClose={() => {
            isVideoEditOpen.value = false
          }}
          onSave={handleSaveVideo}
        />
        <MusicEditDialog
          audio={editingAudio.value}
          isOpen={isAudioEditOpen.value}
          onClose={() => {
            isAudioEditOpen.value = false
          }}
          onSave={handleSaveAudio}
        />
      </div>
    </main>
  )
}