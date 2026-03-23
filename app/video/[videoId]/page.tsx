import VideoPage from "./VideoPage"
import { GetVideoDetails, GetVideoSidebarVideos } from "@/serverActions/GetVideoDetails"
import { notFound as NotFound } from "next/navigation"
import { cache, Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { VideoDetailSkeleton } from "@/components/layout/skeletons"

type PageProps = {
  params: Promise<{ videoId: string }>
}

const CachedVideo = cache(async (id: string) => await GetVideoDetails(id))

export async function generateMetadata({ params }: PageProps) {
  const { videoId } = await params
  const data = await CachedVideo(videoId)

  if (!data) {
    return {
      title: "Video not found",
      description: "This video could not be found",
    }
  }

  return {
    title: `${data.title} - s2`,
    description: data.description,
  }
}

async function VideoContent({ videoId }: { videoId: string }) {
  const supabase = await createClient()

  const [data, sidebar] = await Promise.all([
    CachedVideo(videoId),
    GetVideoSidebarVideos(videoId),
  ])

  if (!data) return <NotFound />

  const { error } = await supabase
    .from("videos")
    .update({ views: Number(data.views) + 1 })
    .eq("video_id", videoId)

  if (error) return <div>View update problem</div>

  return (
    <VideoPage
      videoData={data}
      trendingVideos={sidebar.trending}
      newVideos={sidebar.newest}
    />
  )
}

export default async function PAGE({ params }: PageProps) {
  const { videoId } = await params

  return (
    <Suspense fallback={<VideoDetailSkeleton />}>
      <VideoContent videoId={videoId} />
    </Suspense>
  )
}
