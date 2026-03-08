import { Metadata } from "next"
import { Suspense } from "react"
import Loading from "../loading"
import MusicPage from "./page_client"
import { GetPublicAudios } from "@/serverActions/GetAudioDetails"

export const metadata: Metadata = {
    title: "s2 - Music",
    description: "Listen to Music"
}

export default async function PAGE() {
    const audios = await GetPublicAudios(3600)

    return (
        <Suspense fallback={<Loading />}>
            <MusicPage audios={audios} />
        </Suspense>
    )
}
