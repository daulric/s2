"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSignal } from "@preact/signals-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Calendar, MapPin, Video, Eye, ThumbsUp, Users, UserPlus, UserMinus } from "lucide-react"
import { useAuth } from "@/context/AuthProvider"
import { VideoCard } from "@/components/video-card"
import { useSignals } from "@preact/signals-react/runtime"

export default function UserProfilePage() {
  useSignals();
  const params = useParams();
  const router = useRouter();
  const { user, supabase } = useAuth();
  const userId = params.id as string;

  // Preact Signals for state management
  const userProfile = useSignal(null)
  const userVideos = useSignal([])
  const userStats = useSignal({
    totalVideos: 0,
    totalViews: 0,
    totalLikes: 0,
    subscribers: 0,
  })
  const isSubscribed = useSignal(false)
  const isLoading = useSignal(true)
  const isSubscribing = useSignal(false)

  useEffect(() => {
    if (userId) {
      //loadUserProfile()
      //loadUserVideos()
      //loadUserStats()
      if (user) {
        //checkSubscriptionStatus()
      }
    }
  }, [userId, user])

  const loadUserProfile = async () => {
    try {
      const { data, error } = await supabase.from("profiles")
        .select("*")
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

      userProfile.value = data
    } catch (error) {
      console.error("Error loading user profile:", error)
      toast.error("Failed to load profile", {
        description: "Please try refreshing the page",
      })
    } finally {
      isLoading.value = false
    }
  }

  const loadUserVideos = async () => {
    try {
      // Mock data - replace with actual database query
      const mockVideos = [
        {
          id: `${userId}-video-1`,
          title: "Amazing Tutorial",
          thumbnail: "/placeholder.svg?height=180&width=320",
          views: "2.1K",
          duration: "12:34",
          creator:  "User",
          createdAt: "1 week ago",
        },
        {
          id: `${userId}-video-2`,
          title: "How to Build Apps",
          thumbnail: "/placeholder.svg?height=180&width=320",
          views: "1.5K",
          duration: "18:22",
          creator: "User",
          createdAt: "2 weeks ago",
        },
        {
          id: `${userId}-video-3`,
          title: "Tips and Tricks",
          thumbnail: "/placeholder.svg?height=180&width=320",
          views: "987",
          duration: "8:15",
          creator: "User",
          createdAt: "1 month ago",
        },
      ]

      //userVideos.value = mockVideos
    } catch (error) {
      console.error("Error loading user videos:", error)
    }
  }

  const loadUserStats = async () => {
    try {
      // Mock data - replace with actual database queries
      userStats.value = {
        totalVideos: userVideos.value.length,
        totalViews: 4587,
        totalLikes: 342,
        subscribers: 1250,
      }
    } catch (error) {
      console.error("Error loading user stats:", error)
    }
  }

  const checkSubscriptionStatus = async () => {
    if (!user || user.id === userId) return

    try {
      // Mock subscription check - replace with actual database query
      isSubscribed.value = false
    } catch (error) {
      console.error("Error checking subscription status:", error)
    }
  }

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
          description: `You've unsubscribed from User`,
        })
      } else {
        // Subscribe logic
        isSubscribed.value = true
        userStats.value = {
          ...userStats.value,
          subscribers: userStats.value.subscribers + 1,
        }
        toast.success("Subscribed!", {
          description: `You're now subscribed to User`,
        })
      }
    } catch (error) {
      console.error("Error updating subscription:", error)
      toast.error("Failed to update subscription", {
        description: "Please try again",
      })
    } finally {
      isSubscribing.value = false
    }
  }

  /*if (isLoading.value) {
    return (
      <main className="min-h-screen pt-20 p-4 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-32 bg-muted rounded-lg mb-8"></div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-muted rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (!userProfile.value) {
    return (
      <main className="min-h-screen pt-20 p-4 bg-background">
        <div className="max-w-6xl mx-auto text-center py-12">
          <h1 className="text-2xl font-bold mb-4">User not found</h1>
          <p className="text-muted-foreground mb-4">The user you're looking for doesn't exist.</p>
          <Button onClick={() => router.push("/")}>Go Home</Button>
        </div>
      </main>
    )
  }
  */
  return (
    <main className="min-h-screen pt-20 p-4 bg-background">
      <div className="max-w-6xl mx-auto">
        {/* Profile Header */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <Avatar className="h-24 w-24 sm:h-32 sm:w-32">
                <AvatarImage
                  src={
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${"G"} || "/placeholder.svg"}`
                  }
                  alt={"G"}
                />
                <AvatarFallback className="text-2xl">
                  {"G".charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <h1 className="text-3xl font-bold">{"userProfile.value.username"}</h1>
                <p className="text-muted-foreground mt-2">{ "No bio available"}</p>
                <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {userStats.value.subscribers.toLocaleString()} subscribers
                  </div>
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    {userStats.value.totalVideos} videos
                  </div>
                </div>
              </div>

              {user && user.id !== userId && (
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
                Joined {new Date().toLocaleDateString()}
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
                <CardDescription>{"User"}'s uploaded videos</CardDescription>
              </CardHeader>
              <CardContent>
                {userVideos.value.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {userVideos.value.map((video) => (
                      <VideoCard key={Math.random()} video={video} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No videos yet</h3>
                    <p className="text-muted-foreground">
                      {"userProfile.value.username"} hasn't uploaded any videos yet.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="about" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>About {"userProfile.value.username"}</CardTitle>
                <CardDescription>Learn more about this creator</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground">{"G"}</p>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-4">Details</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Joined {"new Date(userProfile.value.created_at).toLocaleDateString()"}
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
