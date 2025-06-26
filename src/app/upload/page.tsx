import { Metadata } from "next"
import UploadPage from "./page_client"

export const metadata: Metadata = {
    title: "s2 - Upload",
    description: "Upload Yah Video"
}

export default async function PAGE() {
    return ( <UploadPage /> )
}