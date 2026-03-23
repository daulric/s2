"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"

function isVideoOrShortsRoute(path: string) {
  return path.startsWith("/video/") || path === "/shorts" || path.startsWith("/shorts/")
}


function teardownAllVideos() {
  if (typeof document === "undefined") return

  for (const el of document.querySelectorAll("video")) {
    try {
      el.pause()
      el.muted = true
      el.volume = 0
      el.removeAttribute("src")
      el.removeAttribute("poster")
      el.srcObject = null
      el.load()
    } catch {
     
    }
  }

  try {
    if (document.pictureInPictureElement) {
      void document.exitPictureInPicture()
    }
  } catch {
    
  }

  try {
    if (document.fullscreenElement) {
      void document.exitFullscreen()
    }
  } catch {
   
  }
}

export function MediaRouteTeardown() {
  const pathname = usePathname()
  const prevRef = useRef<string | null>(null)

  useEffect(() => {
    const prev = prevRef.current
    prevRef.current = pathname

    if (prev === null) return

    if (isVideoOrShortsRoute(prev) && !isVideoOrShortsRoute(pathname)) {
      teardownAllVideos()
    }
  }, [pathname])

  return null
}
