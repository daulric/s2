import VideoPage from "./VideoPage";
import { GetVideoDetails, GetPublicVideos } from "@/serverActions/GetVideoDetails";
import { notFound as NotFound } from "next/navigation";
import { cache, Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import Loading from "@/app/loading";

type PageProps = {
  params: Promise<{ videoId: string }>;
};

const CachedVideo = cache(async (id: string) => await GetVideoDetails(id));

export async function generateMetadata({ params }: PageProps) {
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

async function VideoContent({ videoId }: { videoId: string }) {
  const supabase = await createClient();

  const [data, PublicVideos] = await Promise.all([
    CachedVideo(videoId),
    GetPublicVideos()
  ]);

  if (!data) return <NotFound />;

  const { error } = await supabase
    .from("videos")
    .update({ views: (Number(data.views) + 1) })
    .eq("video_id", videoId);

  if (error) return <div>View update problem</div>;

  return <VideoPage videoData={data} public_videos={PublicVideos ?? []} />;
}

export default async function PAGE({ params }: PageProps) {
  const { videoId } = await params;

  return (
    <Suspense fallback={<Loading />}>
      <VideoContent videoId={videoId} />
    </Suspense>
  )
}
