import { GetPublicVideos } from "@/serverActions/GetVideoDetails"
import { notFound as NotFound } from "next/navigation";
import HomePage from "./home_page"

export const metadata = {
    title: "s2 - Home",
    description: "s2 - a fuze successor",
}

export default async function HOMEPAGE() {
    const public_videos = await GetPublicVideos();

    if (!public_videos) return (<NotFound /> );
    return (<HomePage videos={public_videos} />)
}