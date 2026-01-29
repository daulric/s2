"use client"

import { useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSignal } from "@preact/signals-react"
import { toast } from "sonner"
import { Button } from "../../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs"
import { Separator } from "../../../components/ui/separator"
import { Calendar, Video, Eye, ThumbsUp, Users, UserPlus, UserMinus } from "lucide-react"
import { useAuth } from "../../../context/AuthProvider"
import { VideoCard } from "../../../components/video-card"
import { useSignals } from "@preact/signals-react/runtime"
import convert, { VideoData, VideoInfoProps } from "../../../lib/videos/data-to-video-format"
import upsert from "../../../lib/supabase/upsert"
import Loading from "./loading"
import { BadgeCheckIcon } from "lucide-react"
import { Badge } from "../../../components/ui/badge"

interface VideoDataAdded extends VideoData {
  video_likes?: { is_liked: boolean }[]
}

export default function UserProfilePage() {
  useSignals();
  const params = useParams();
  const router = useRouter();
  const { user: { user }, supabase } = useAuth();
  const userId = params.id as string;
  
  // Preact Signals for state management
  const userProfile = useSignal<{ [key: string]: any } | null>(null);
  const userVideos = useSignal<VideoInfoProps[]>([])
  const userStats = useSignal({
    totalVideos: 0,
    totalViews: 0,
    totalLikes: 0,
    subscribers: 0,
  });
  const isSubscribed = useSignal(false);
  const isLoading = useSignal(true);
  const isSubscribing = useSignal(false);

  const loadUserProfile = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("profiles")
      .select("*, subscribers!subscribers_vendor_fkey1(*)")
      .eq("id", userId)
      .single();

      if (error) {
        if (error.code === "PGRST116") {
          toast.error("User not found", {
            description: "The user you're looking for doesn't exist",
          })
          router.push("/")
          return
        }
        throw error
      }

      userProfile.value = data;
      document.title = `${data.username}'s Profile - s2`;

      if (data.subscribers) {
        const total_subs = data.subscribers.filter((i: any) => i.is_subscribed && i.is_subscribed === true);
        userStats.value = {...userStats.value, subscribers: total_subs.length};
      }

      return data;
    } catch (error) {
      toast.error("Failed to load profile", {
        description: "Please try refreshing the page",
      })
    }
  }, [userId, supabase, router, userProfile, userStats])

  const loadUserVideos = useCallback(async () => {
    try {
      if (!userProfile.value) return;
      
      const { data, error } = await supabase.from("videos")
        .select("*, video_likes(is_liked)")
        .eq("visibility", "public")
        .eq("userid", userProfile.value?.id);

      if (error) throw error;

      userStats.value = {...userStats.value, totalVideos: data.length};

      data.map(async (i: VideoDataAdded) => {
        const conversion = await convert(supabase, i, 30);
        if (!conversion) throw `${i.video_id} failed to be converted to video format`;

        if (i.views) {
          userStats.value = {
            ...userStats.value,
            totalViews: userStats.value?.totalViews + i.views
          }
        }

        userStats.value = { 
          ...userStats.value, 
          totalLikes: userStats.value.totalLikes + ((i.video_likes?.filter((i) => i.is_liked)?.length) ?? 0)
        }

        userVideos.value = [...userVideos.value, conversion]
      });

    } catch {}
  }, [userProfile, supabase, userStats, userVideos])

  const checkSubscriptionStatus = useCallback(async () => {
    if (!user || user.id === userId) return;
    if (!userProfile.value?.id) return;

    try {

      const { data, error } = await supabase.from("subscribers")
        .select("*")
        .eq("subscriber", user.id)
        .eq("vendor", userProfile.value?.id)
        .single();
      
      if (error) throw error;
      
      isSubscribed.value = data.is_subscribed;
    } catch {};
  }, [user, userId, userProfile, supabase, isSubscribed])

  // For the various user status
  useEffect(() => {
    if (!userId) return;
    if (!supabase) return; // context may not be ready

    let cancelled = false;

    async function loadData() {
      if (cancelled) return;

      try {

        await loadUserProfile();

        if (!cancelled && userProfile.value?.id) {
          await loadUserVideos();
        }

        if (!cancelled && user?.id && userProfile.value?.id) {
          await checkSubscriptionStatus();
        }

      } finally {
        if (!cancelled) isLoading.value = false;
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [userId, supabase, user, loadUserProfile, loadUserVideos, checkSubscriptionStatus, isLoading, userProfile]);

  const handleSubscribe = async () => {
    if (!user) {
      toast.error("Authentication required", {
        description: "Please sign in to subscribe to channels",
      })
      return
    }

    if (user.id === userId) {
      toast.error("Cannot subscribe to yourself", {
        description: "You cannot subscribe to your own channel",
      })
      return
    }

    isSubscribing.value = true

    try {
      if (isSubscribed.value) {
        // Unsubscribe logic
        isSubscribed.value = false

        userStats.value = {
          ...userStats.value,
          subscribers: userStats.value.subscribers - 1,
        }
        toast.success("Unsubscribed", {
          description: `You've unsubscribed from ${userProfile.value?.username}`,
        })
      } else {
        // Subscribe logic
        isSubscribed.value = true
        userStats.value = {
          ...userStats.value,
          subscribers: userStats.value.subscribers + 1,
        }
        toast.success("Subscribed!", {
          description: `You're now subscribed to ${userProfile.value?.username}`,
        })
      }

      upsert(
        supabase,
        "subscribers",
        { vendor: userId, subscriber: user.id },
        { is_subscribed: isSubscribed.value }
      );
    } catch (error) {
      toast.error("Failed to update subscription", {
        description: "Please try again",
      })
    } finally {
      isSubscribing.value = false
    }
  }

  if (isLoading.value) {
    return (
      <Loading />
    )
  }

  if (!userProfile.value) {
    return (
      <main className="min-h-screen pt-20 p-4 bg-background">
        <div className="max-w-6xl mx-auto text-center py-12">
          <h1 className="text-2xl font-bold mb-4">User not found</h1>
                  <p className="text-muted-foreground mb-4">The user you&apos;re looking for doesn&apos;t exist.</p>
          <Button onClick={() => router.push("/")}>Go Home</Button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen pt-20 p-4 bg-background">
      <div className="max-w-6xl mx-auto">
        {/* Profile Header */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <Avatar className="h-24 w-24 sm:h-32 sm:w-32">
                <AvatarImage
                  src={`${process.env.NEXT_PUBLIC_PROFILE}${userProfile.value?.username}`  || "/logo.jpeg"}
                  alt={"G"}
                />
                <AvatarFallback className="text-2xl">
                  {userProfile.value.username.charAt(0).toUpperCase() || "G"}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  {userProfile.value?.username}
                  {
                    userProfile.value?.is_verified && (
                      <Badge
                        variant="secondary"
                        className="bg-blue-500 text-white dark:bg-blue-600 flex items-center gap-1"
                      >
                        <BadgeCheckIcon className="w-4 h-4" />
                        Verified
                      </Badge>
                    )
                  }
                </h1>
                <p className="text-muted-foreground mt-2">{ userProfile.value?.description}</p>
                <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {userStats.value.subscribers} subscribers
                  </div>
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    {userStats.value.totalVideos} videos
                  </div>
                </div>
              </div>

              {(user && user.id !== userId) && (
                <Button
                  onClick={handleSubscribe}
                  disabled={isSubscribing.value}
                  variant={isSubscribed.value ? "outline" : "default"}
                  className="flex items-center gap-2"
                >
                  {isSubscribed.value ? (
                    <>
                      <UserMinus className="h-4 w-4" />
                      {isSubscribing.value ? "Unsubscribing..." : "Unsubscribe"}
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      {isSubscribing.value ? "Subscribing..." : "Subscribe"}
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Joined {new Date(userProfile.value?.created_at).toLocaleDateString()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Video className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{userStats.value.totalVideos}</p>
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
                  <p className="text-2xl font-bold">{userStats.value.totalViews.toLocaleString()}</p>
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
                  <p className="text-2xl font-bold">{userStats.value.totalLikes}</p>
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
                  <p className="text-2xl font-bold">{userStats.value.subscribers.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Subscribers</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="videos" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="videos">Videos</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>

          <TabsContent value="videos" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Videos</CardTitle>
                <CardDescription>{"User"}&apos;s uploaded videos</CardDescription>
              </CardHeader>
              <CardContent>
                {userVideos.value.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {userVideos.value.map((video) => (
                      <VideoCard key={Math.random()} video={video} supabase={supabase} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No videos yet</h3>
                    <p className="text-muted-foreground">
                      {userProfile.value.username} hasn&apos;t uploaded any videos yet.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="about" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>About {userProfile.value?.username}</CardTitle>
                <CardDescription>Learn more about this creator</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground">{userProfile.value?.description}</p>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-4">Details</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Joined {new Date(userProfile.value?.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-4">Stats</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-2xl font-bold">{userStats.value.totalVideos}</p>
                      <p className="text-sm text-muted-foreground">Videos uploaded</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{userStats.value.totalViews.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">Total views</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}