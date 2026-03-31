import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { SupabaseClient } from "@supabase/supabase-js"
import { isUserSubscribed } from "@/lib/subscription"
import { GetPublicVideos, GetUserVideos, GetSubscriptionVideos } from "@/serverActions/GetVideoDetails"
import { GetPublicAudios } from "@/serverActions/GetAudioDetails"
import { GetWatchlistStocks, GetTopMovers } from "@/serverActions/GetStockDetails"
import { HomeFeedSkeleton } from "@/components/layout/skeletons"
import HomePage from "./home_page"

export const metadata = {
    title: "s2 - Home",
    description: "s2 - a fuze successor",
}

async function HomeContent() {
    const supabase = (await createClient()) as SupabaseClient
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        const [videos, audios] = await Promise.all([
            GetPublicVideos(30, 10),
            GetPublicAudios(60, 5),
        ])

        return (
            <HomePage
                isGuest
                trendingVideos={videos ?? []}
                guestAudios={audios ?? []}
            />
        )
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

    const role = profile?.role as string | undefined
    const subscribed = await isUserSubscribed(user.id)
    const isPremium = subscribed || role === "admin"

    const basePromises = Promise.all([
        GetUserVideos(user.id, 5),
        GetSubscriptionVideos(user.id, 5),
    ])

    const premiumPromises = isPremium
        ? Promise.all([
            GetWatchlistStocks(),
            GetTopMovers(5),
            GetPublicAudios(60, 5),
        ])
        : Promise.resolve(null)

    const [baseResults, premiumResults] = await Promise.all([basePromises, premiumPromises])
    const [myVideos, subVideos] = baseResults

    let watchlistStocks = premiumResults?.[0] ?? []
    const topStocks = premiumResults?.[1] ?? []
    const audios = premiumResults?.[2] ?? []

    const hasWatchlist = watchlistStocks.length > 0
    const stocks = hasWatchlist ? watchlistStocks : topStocks

    return (
        <HomePage
            myVideos={myVideos}
            subVideos={subVideos}
            isPremium={isPremium}
            stocks={stocks}
            hasWatchlist={hasWatchlist}
            audios={audios}
        />
    )
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
