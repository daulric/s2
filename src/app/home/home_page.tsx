"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/context/AuthProvider"
import { VideoCard } from "@/components/video-card"
import { VideoInfoProps } from "@/lib/videos/data-to-video-format";

export default function HomePage({videos}: { videos: VideoInfoProps[] }) {
  const { user: { profile }, supabase } = useAuth();

  return (
    <>
      <main className="min-h-screen pt-15 p-4 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold">Welcome {profile?.username || "Guest"}</h1>
              <p className="text-muted-foreground">Your Place of Rest</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} supabase={supabase} />
            ))}
          </div>

          <div className="mt-12">
            {/*
            <Card>
              <CardHeader>
                <CardTitle>Popular Categories</CardTitle>
                <CardDescription>Browse videos by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button variant="outline" className="h-auto py-4 justify-start">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">JavaScript</span>
                      <span className="text-xs text-muted-foreground">1.2K videos</span>
                    </div>
                  </Button>
                  <Button variant="outline" className="h-auto py-4 justify-start">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">React</span>
                      <span className="text-xs text-muted-foreground">856 videos</span>
                    </div>
                  </Button>
                  <Button variant="outline" className="h-auto py-4 justify-start">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">CSS</span>
                      <span className="text-xs text-muted-foreground">743 videos</span>
                    </div>
                  </Button>
                  <Button variant="outline" className="h-auto py-4 justify-start">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Node.js</span>
                      <span className="text-xs text-muted-foreground">512 videos</span>
                    </div>
                  </Button>
                </div>
              </CardContent>

            </Card>
            */}
          </div>
        </div>
      </main>
    </>
  )
}