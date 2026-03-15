"use client"

import { Loader2, VideoOff } from "lucide-react"

function HideHeader() {
  return (
    <style jsx global>{`
      header { display: none !important; }
      main { padding-top: 0 !important; }
    `}</style>
  )
}

export function ShortsLoading() {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <HideHeader />
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 text-white/60 animate-spin" />
        <span className="text-white/80 text-sm">loading shorts...</span>
      </div>
    </div>
  )
}

export function ShortsEmpty() {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <HideHeader />
      <div className="flex flex-col items-center gap-3">
        <VideoOff className="h-10 w-10 text-white/40" />
        <span className="text-white/80 text-lg">no shorts available</span>
      </div>
    </div>
  )
}

export { HideHeader }
