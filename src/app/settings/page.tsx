"use client"

import type React from "react"

import { useState, useEffect } from "react"
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
import { Mail, Calendar, MapPin, LinkIcon, Camera, Edit3, Save, X, Video, Eye, ThumbsUp, Users } from "lucide-react"
import { useAuth } from "@/context/AuthProvider"
import { VideoCard , VideoProps} from "@/components/video-card"
import { VideoEditDialog } from "@/components/video-edit-dialog"
import { useSignal, useComputed } from "@preact/signals-react"
import Link from "next/link"
import converttovideoformat, { VideoData, VideoInfoProps } from "@/lib/videos/data-to-video-format"
import { useSignals } from "@preact/signals-react/runtime"

interface VideoWithLikes extends VideoData {
  video_likes: { is_liked: boolean, videos?: VideoData }[];
}

interface VideoLikes {
  is_liked: boolean, 
  videos?: VideoData,
}

export default function ProfilePage() {
  useSignals();
  const { user: { user }, supabase } = useAuth();
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [profileData, setProfileData] = useState({
    id: "",
    username: "",
    email: "",
    description: "",
    created_at: "",
    avatar_url: "",
  });

  const [editingVideo, setEditingVideo] = useState<any>(null)
  const [isVideoEditOpen, setIsVideoEditOpen] = useState(false)

  // Signals
  const subscribers = useSignal(0);
  const views = useSignal(0);
  const total_video_count = useSignal(0);
  const total_likes = useSignal(0);
  const total_liked_videos = useSignal<VideoInfoProps[]>([]);
  const user_videos = useSignal<VideoInfoProps[]>([]);

  useEffect(() => {
    if (user) {
      document.title = "s2 - Settings"
      // Load user profile data
      loadProfile();
      load_subs();
      load_videos();
      load_liked_video();
      return
    } else {
      document.title = "s2 - 401"
    }


    return () => {
      user_videos.value = [];
      total_liked_videos.value = [];
      total_likes.value = 0;
      total_video_count.value = 0;
      subscribers.value = 0;
      views.value = 0;
    }
  }, [user])

  const loadProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      if (error && error.code !== "PGRST116") {
        throw error
      }

      if (data) {
        setProfileData({
          id: user.id,
          username: data.username || "",
          email: user.email || "",
          description: data.description || "",
          created_at: new Date(user.created_at).toLocaleDateString('en-GB'),
          avatar_url: data.avatar_url || "",
        })
      
      } else {
        // Create profile if it doesn't exist
        setProfileData({
          id: user.id,
          username: "",
          email: user.email || "",
          description: "",
          created_at: new Date(user.created_at).toLocaleDateString('en-GB'),
          avatar_url: "",
        })
      }
    } catch (error) {
      toast.error("Failed to load profile", {
        description: "Please try refreshing the page",
      })
    }
  }

  const load_subs = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("subscribers")
      .select("*")
      .eq("vendor", user.id);
    
    if (error) return;
    subscribers.value = data.length;
  }

  const load_videos = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("videos")
      .select("*, video_likes(is_liked)")
      .eq("userid", user.id);
    
    if (error || !data) return
    
    let view_count: number = 0;

    data.map(async (i: VideoData) => {
      if (i.views)
      view_count += i.views;
      
      const video =  await(converttovideoformat(supabase, i, 120));
  
      if (!user_videos.value.some(item => item.id === video.id)) {
        user_videos.value = [...user_videos.value, video];
      }
    });

    const totalLikesCount: number = data?.reduce((total: number, video: VideoWithLikes) => 
      total + video.video_likes.filter(like => like.is_liked === true).length, 0
    ) || 0;

    views.value = view_count;
    total_likes.value = totalLikesCount
    total_video_count.value = data.length;
  }

  const load_liked_video = async () => {
    if (!user) return;

    const { data, error } = await supabase.from("video_likes")
      .select("*, videos(*)")
      .eq("userid", user.id)
      .eq("is_liked", true);
    
    if (error) return;
    data.map(async (i: VideoLikes) => {
      if (!i.videos) return;

      const contered = await (converttovideoformat(supabase,  i.videos, 120));
      if (!total_liked_videos.value.find(i => i.id === contered.id)) {
        total_liked_videos.value = [...total_liked_videos.value, contered];
      }
    });
  }

  const handleSaveProfile = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        username: profileData.username,
        description: profileData.description,
        avatar_url: profileData.avatar_url,
      })

      if (error) throw error

      setIsEditing(false)
      toast.success("Profile updated", {
        description: "Your profile has been saved successfully",
      })
    } catch (error) {
      console.error("Error saving profile:", error)
      toast.error("Failed to save profile", {
        description: "Please try again",
      })
    } finally {
      setIsLoading(false)
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

    setIsLoading(true)
    try {
      const fileExt = file.name.split(".").pop()
      const fileName = `${user.id}-${Math.random()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file)

      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath)

      setProfileData((prev) => ({ ...prev, avatar_url: publicUrl }))

      toast.success("Avatar uploaded", {
        description: "Don't forget to save your profile",
      })
    } catch (error) {
      console.error("Error uploading avatar:", error)
      toast.error("Failed to upload avatar", {
        description: "Please try again",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditVideo = (video: any) => {
    setEditingVideo({...video})
    setIsVideoEditOpen(true)
  }

  const handleSaveVideo = async (updatedVideo: any) => {

    const { error } = await supabase
      .from("videos")
      .update(updatedVideo)
      .eq("video_id", updatedVideo.video_id)

    if (error) {
      toast.error("Details Upload Error", {
        description: typeof error === "string" ? error : error?.message || String(error),
      });
    }

    setEditingVideo(null)
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
                      profileData.avatar_url ||
                      `${process.env.NEXT_PUBLIC_PROFILE}${profileData.username || user.email}`
                    }
                    alt={profileData.username || "User"}
                  />
                  <AvatarFallback className="text-2xl">
                    {(profileData.username || user.email || "G").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {isEditing && (
                  <label className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground rounded-full p-2 cursor-pointer hover:bg-primary/90 transition-colors">
                    <Camera className="h-4 w-4" />
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                  </label>
                )}
              </div>

              <div className="flex-1">
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={profileData.username}
                        onChange={(e) => setProfileData((prev) => ({ ...prev, username: e.target.value }))}
                        placeholder="Enter your username"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={profileData.description}
                        onChange={(e) => setProfileData((prev) => ({ ...prev, description: e.target.value }))}
                        placeholder="Tell us about yourself..."
                        rows={3}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <h1 className="text-3xl font-bold">{profileData.username || "Set your username"}</h1>
                    <p className="text-muted-foreground mt-2">{profileData.description || "No bio added yet"}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button onClick={handleSaveProfile} disabled={isLoading}>
                      <Save className="h-4 w-4 mr-2" />
                      {isLoading ? "Saving..." : "Save"}
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setIsEditing(true)}>
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          {!isEditing && (
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {profileData.email}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Joined {profileData.created_at}
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
                  <p className="text-2xl font-bold">{ subscribers.value }</p>
                  <p className="text-sm text-muted-foreground">Subscribers</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="videos" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="videos">My Videos</TabsTrigger>
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
               { user_videos.value !== null && user_videos.value.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    { user_videos.value?.map((video) => (
                      <div key={video.id} className="relative group">
                        <VideoCard video={video} compact />
                        <div className="absolute top-2 right-2 opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleEditVideo(video)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )) }
                  </div>
               ): (
                <div className="text-center py-12">
                  <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No videos yet</h3>
                  <p className="text-muted-foreground mb-4">Start creating content by uploading your first video</p>
                  <Button asChild>
                    <Link href="/upload">Upload Video</Link>
                  </Button>
                </div>
               ) }
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="liked" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Liked Videos</CardTitle>
                <CardDescription>Videos you've liked</CardDescription>
              </CardHeader>
              <CardContent>
                { total_liked_videos.value.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {total_liked_videos.value.map((video) => (
                      <VideoCard key={video.id} video={video} compact />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <ThumbsUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No liked videos</h3>
                    <p className="text-muted-foreground">Videos you like will appear here</p>
                  </div>
              ) }
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
                  <h3 className="text-lg font-semibold mb-4">Danger Zone</h3>
                  <div className="space-y-4">
                    <Button variant="destructive" className="w-full sm:w-auto">
                      Delete Account
                    </Button>
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
          video={editingVideo}
          isOpen={isVideoEditOpen}
          onClose={() => setIsVideoEditOpen(false)}
          onSave={handleSaveVideo}
        />
      </div>
    </main>
  )
}