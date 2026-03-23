"use client"

import { useSignal, useSignals } from "@preact/signals-react/runtime"
import { useEffect } from "react"

export type BrowserShareData = ShareData

export type ShareBrowserResult = "shared" | "cancelled"

function isShareSupported(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function"
}

export async function shareBrowser(data: BrowserShareData): Promise<ShareBrowserResult> {
  if (!isShareSupported()) {
    throw new Error("Web Share API is not available in this browser")
  }

  if (navigator.canShare && !navigator.canShare(data)) {
    throw new Error("This content cannot be shared on this device")
  }

  try {
    await navigator.share(data)
    return "shared"
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return "cancelled"
    }
    throw err
  }
}


export function useBrowserShare() {
  useSignals()
  const canShare = useSignal(false)

  useEffect(() => {
    canShare.value = isShareSupported()
  }, [canShare])

  return { canShare, share: shareBrowser }
}
