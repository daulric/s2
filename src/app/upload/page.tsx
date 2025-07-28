import { Metadata } from "next"
import UploadPage from "./page_client"
import Loading from "@/app/loading"
import { Suspense } from "react"

export const metadata: Metadata = {
    title: "s2 - Upload",
    description: "Upload Yah Video"
}

export default async function PAGE() {
    return (
        <Suspense fallback={<Loading />}>
            <UploadPage />
        </Suspense>
    )
}