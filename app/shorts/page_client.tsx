"use client"

import { useSignal } from "@preact/signals-react"
import { useSignals } from "@preact/signals-react/runtime"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useShorts } from "@/hooks/use-shorts"
import { ShortsFeed } from "@/components/scrolling-video/shorts-feed"
import { ShortsEmpty, HideHeader, ShortsLoading } from "@/components/scrolling-video/shorts-overlay"
import type { ShortVideoData } from "@/components/scrolling-video/types"
import { isStandaloneDisplay } from "@/lib/user/use-pwa"

interface ShortsClientProps {
  initialData: ShortVideoData[]
}

export default function ShortsClient({ initialData }: ShortsClientProps) {
  useSignals()
  const { shorts, user } = useShorts(initialData)
  const router = useRouter()
  const currentIndex = useSignal(0)
  const shortsAllowed = useSignal(false)

  useEffect(() => {
    if (isStandaloneDisplay()) {
      shortsAllowed.value = true
    } else {
      router.replace("/install-app")
    }
  }, [router])

  if (!shortsAllowed.value) {
    return <ShortsLoading />
  }

  if (shorts.value.length === 0) return <ShortsEmpty />

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      <HideHeader />
      <ShortsFeed shorts={shorts} currentIndex={currentIndex} currentUser={user ?? undefined} />
    </div>
  )
}
