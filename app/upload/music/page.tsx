import { Metadata } from "next"
import UploadMusicPage from "./page_client"
import Loading from "@/app/loading"
import { Suspense } from "react"

export const metadata: Metadata = {
    title: "s2 - Upload Music",
    description: "Upload Your Music"
}

export default async function PAGE() {
    return (
        <Suspense fallback={<Loading />}>
            <UploadMusicPage />
        </Suspense>
    )
}
