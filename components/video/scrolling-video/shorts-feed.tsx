"use client"

import { useEffect, useRef } from "react"
import type { Signal } from "@preact/signals-react"
import type { User } from "@supabase/supabase-js"
import { ShortVideo } from "./short-video"
import type { ShortVideoData } from "./types"

interface ShortsFeedProps {
  shorts: Signal<ShortVideoData[]>
  currentIndex: Signal<number>
  currentUser: User | null | undefined
}

export function ShortsFeed({ shorts, currentIndex, currentUser }: ShortsFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" && currentIndex.value > 0) {
        currentIndex.value -= 1
      } else if (e.key === "ArrowDown" && currentIndex.value < shorts.value.length - 1) {
        currentIndex.value += 1
      }
    }

    globalThis.addEventListener("keydown", handleKeyDown)
    return () => globalThis.removeEventListener("keydown", handleKeyDown)
  }, [currentIndex, shorts])

  useEffect(() => {
    if (containerRef.current && shorts.value.length > 0) {
      const element = containerRef.current.children[currentIndex.value] as HTMLElement
      element?.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [currentIndex.value, shorts.value.length])

  useEffect(() => {
    if (shorts.value.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const index = Number.parseInt(entry.target.getAttribute("data-index") || "0")
            currentIndex.value = index
          }
        }
      },
      { threshold: 0.5 },
    )

    if (containerRef.current) {
      for (const child of Array.from(containerRef.current.children)) {
        observer.observe(child)
      }
    }

    return () => observer.disconnect()
  }, [shorts.value, currentIndex])

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto snap-y snap-mandatory scrollbar-hide"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      {shorts.value.map((short, index) => (
        <div key={short.id} data-index={index} className="h-screen snap-start relative">
          <ShortVideo short={short} isActive={index === currentIndex.value} currentUser={currentUser} />
        </div>
      ))}
    </div>
  )
}
