import VideoPage from "./VideoPage"
import { GetVideoDetails, GetPublicVideos } from "@/serverActions/GetVideoDetails"
import { notFound as NotFound } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

const CachedVideo = cache(async (id: string) => await GetVideoDetails(id));

export async function generateMetadata({params}: { params: { videoId: string } }) {
    const id = (await params).videoId;
    const data = await CachedVideo(id);

    if (!data) {
        return {
            title: "video not found",
            description: "no found",
        }
    }

    return {
        title: `${data.title} - s2`,
        description: data.description,
    }

}

export default async function PAGE({params}: { params: { videoId: string } }) {
    const id = (await params).videoId;
    const supabase = await createClient();
    const data = await CachedVideo(id)

    if (!data) return (<NotFound />);

    const PublicVideos = await GetPublicVideos();

    const {  error } = await supabase
        .from("videos")
        .update({views: (Number(data.views) + 1)})
        .eq("video_id", id)

    if (error) return ( <div>Vue Problem</div> );
    return (<VideoPage videoData={data} public_videos={PublicVideos ?? []}/>)
}