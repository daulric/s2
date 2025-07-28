import VideoPage from "./VideoPage";
import { GetVideoDetails, GetPublicVideos } from "@/serverActions/GetVideoDetails";
import { notFound as NotFound } from "next/navigation";
import { cache, Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import Loading from "@/app/loading";

// Updated type to use Promise
type PageProps = {
  params: Promise<{ videoId: string }>;
};

const CachedVideo = cache(async (id: string) => await GetVideoDetails(id));

export async function generateMetadata({ params }: PageProps) {
  // Await the params promise
  const { videoId } = await params;
  const data = await CachedVideo(videoId);

  if (!data) {
    return {
      title: "Video not found",
      description: "This video could not be found",
    };
  }

  return {
    title: `${data.title} - s2`,
    description: data.description,
  };
}

export default async function PAGE({ params }: PageProps) {
  // Await the params promise
  const { videoId } = await params;
  const supabase = await createClient();
  const data = await CachedVideo(videoId);

  if (!data) return <NotFound />;

  const PublicVideos = await GetPublicVideos();

  const { error } = await supabase
    .from("videos")
    .update({ views: (Number(data.views) + 1) })
    .eq("video_id", videoId);

  if (error) return <div>View update problem</div>;
  
  return (
    <Suspense fallback={<Loading />}>
      <VideoPage videoData={data} public_videos={PublicVideos ?? []} />;
    </Suspense>
  )

}