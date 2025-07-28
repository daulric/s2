import { GetPublicVideos } from "@/serverActions/GetVideoDetails"
import { notFound as NotFound } from "next/navigation";
import HomePage from "./home_page"
import { Suspense } from "react";

export const metadata = {
    title: "s2 - Home",
    description: "s2 - a fuze successor",
}

export default async function HOMEPAGE() {
    const public_videos = await GetPublicVideos();

    if (!public_videos) return (<NotFound /> );
    return (
        <main className="min-h-screen pt-15 p-4 bg-background">
            <Suspense>
                <HomePage videos={public_videos} />
            </Suspense>
        </main>
)
}