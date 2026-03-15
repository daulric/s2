"use client"

import { useSignal } from "@preact/signals-react"
import { useSignals } from "@preact/signals-react/runtime"
import { useShorts } from "@/hooks/use-shorts"
import { ShortsFeed } from "@/components/scrolling-video/shorts-feed"
import { ShortsEmpty, HideHeader } from "@/components/scrolling-video/shorts-overlay"
import type { ShortVideoData } from "@/components/scrolling-video/types"

interface ShortsClientProps {
  initialData: ShortVideoData[]
}

export default function ShortsClient({ initialData }: ShortsClientProps) {
  useSignals()
  const { shorts, user } = useShorts(initialData)
  const currentIndex = useSignal(0)

  if (shorts.value.length === 0) return <ShortsEmpty />

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      <HideHeader />
      <ShortsFeed shorts={shorts} currentIndex={currentIndex} currentUser={user ?? undefined} />
    </div>
  )
}
