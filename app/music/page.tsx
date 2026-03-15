import { Metadata } from "next"
import { Suspense } from "react"
import Loading from "@/app/loading"
import MusicPage from "./page_client"
import { GetPublicAudios } from "@/serverActions/GetAudioDetails"

export const metadata: Metadata = {
    title: "s2 - Music",
    description: "Listen to Music"
}

async function MusicContent({ selectedId }: { selectedId?: string }) {
    const audios = await GetPublicAudios(3600)
    return <MusicPage audios={audios} selectedId={selectedId} />
}

export default async function PAGE({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
    const params = await searchParams

    return (
        <Suspense fallback={<Loading />}>
            <MusicContent selectedId={params.id} />
        </Suspense>
    )
}
