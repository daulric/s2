import { GetPublicVideos } from "@/serverActions/GetVideoDetails"
import { notFound as NotFound } from "next/navigation";
import HomePage from "./home_page"
import { Suspense } from "react";
import { HomeFeedSkeleton } from "@/components/layout/skeletons"

export const metadata = {
    title: "s2 - Home",
    description: "s2 - a fuze successor",
}

async function HomeContent() {
    const public_videos = await GetPublicVideos();
    if (!public_videos) return (<NotFound /> );

    return <HomePage videos={public_videos} />
}

export default function HOMEPAGE() {
    return (
        <main className="min-h-screen pt-15 p-4 bg-background">
            <Suspense fallback={<HomeFeedSkeleton />}>
                <HomeContent />
            </Suspense>
        </main>
    )
}
