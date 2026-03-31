import { Suspense } from "react"
import { GetShortsData } from "@/serverActions/GetShortsData"
import ShortsClient from "./page_client"
import { ShortsLoading } from "@/components/video"

async function ShortsContent() {
  const shorts = await GetShortsData()
  return <ShortsClient initialData={shorts} />
}

export default function ShortsPage() {
  return (
    <Suspense fallback={<ShortsLoading />}>
      <ShortsContent />
    </Suspense>
  )
}
