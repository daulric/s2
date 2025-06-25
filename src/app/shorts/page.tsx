"use client"

import { useEffect, useRef } from "react"
import { useSignal } from "@preact/signals-react"
import { ShortVideo } from "@/components/scrolling-video/short-video"
import { useAuth } from "@/context/AuthProvider"
import { useSignals } from "@preact/signals-react/runtime"
import converttoVideo, { type VideoData, type VideoInfoProps } from "@/lib/videos/data-to-video-format"

interface shorts_extends extends VideoInfoProps {
  likes?: number
  is_liked?: boolean
  is_subscribed?: boolean | null,
  subscribers?: number
}

export default function ShortsPage() {
  useSignals()
  const { user: { user },  supabase } = useAuth()
  const containerRef = useRef<HTMLDivElement>(null)
  const currentIndex = useSignal(0)
  const shorts = useSignal<shorts_extends[]>([])
  const isLoading = useSignal(true);

  useEffect(() => {
    async function fetchShorts() {
      try {
        const { data, error } = await supabase.from("videos")
        .select("*, video_likes(*)")

        if (error) {
          console.error("Error fetching shorts:", error)
          return
        }

        if (data) {
          const formattedShorts: shorts_extends[] = []

          // Process videos sequentially to avoid race conditions
          for (const short of data) {
            try {
              const formattedShort = await converttoVideo(supabase, short as VideoData, 3600);

              if (formattedShort) {
                let subscriberData = null;
                let user_liked = false;

                const { data: total_subs } = await supabase
                  .from("subscribers")
                  .select("*")
                  .eq("vendor", formattedShort.creator_id)
                  .eq("is_subscribed", true);

                if (user) {
                  if (user.id !== formattedShort.creator_id) {
                  
                    const { data: dd} = await supabase
                      .from("subscribers")
                      .select("*")
                      .eq("subscriber", user.id)
                      .eq("vendor", formattedShort.creator_id)
                      .single()
                    
                    if (dd) {
                      subscriberData = dd;
                    }
                    
                  };
                  
                  const is_user_liked = short.video_likes.filter((i:  { userid: string, is_liked: boolean }) => ( i.userid === user.id && i.is_liked === true));
                  
                  if (is_user_liked) {
                    user_liked = true;
                  }
                }
               
                formattedShorts.push({
                  ...formattedShort,
                  likes: short.video_likes.filter((v: { is_liked: boolean }) => v.is_liked === true).length,
                  is_liked: user_liked,
                  is_subscribed: subscriberData?.is_subscribed ?? null,
                  subscribers: total_subs ? total_subs.length : 0,
                });

              }
            } catch (error) {
              console.error("Error converting video:", error)
            }
          }

          shorts.value = formattedShorts;
        }
      } catch (error) {
        console.error("Error in fetchShorts:", error)
      } finally {
        isLoading.value = false
      }
    }

    fetchShorts();
  }, [user])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" && currentIndex.value > 0) {
        currentIndex.value = currentIndex.value - 1
      } else if (e.key === "ArrowDown" && currentIndex.value < shorts.value.length - 1) {
        currentIndex.value = currentIndex.value + 1
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Scroll to current video
  useEffect(() => {
    if (containerRef.current && shorts.value.length > 0) {
      const element = containerRef.current.children[currentIndex.value] as HTMLElement
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" })
      }
    }
  }, [currentIndex.value])

  // Intersection Observer to track which video is in view
  useEffect(() => {
    if (shorts.value.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number.parseInt(entry.target.getAttribute("data-index") || "0")
            currentIndex.value = index
          }
        })
      },
      { threshold: 0.5 },
    )

    if (containerRef.current) {
      Array.from(containerRef.current.children).forEach((child) => {
        observer.observe(child)
      })
    }

    return () => observer.disconnect()
  }, [shorts.value])

  if (isLoading.value) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-white text-lg">Loading shorts...</div>
      </div>
    )
  }

  if (shorts.value.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-white text-lg">No shorts available</div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Hide header for full immersion */}
      <style jsx global>{`
        header {
          display: none !important;
        }
        main {
          padding-top: 0 !important;
        }
      `}</style>

      <div
        ref={containerRef}
        className="h-full overflow-y-auto snap-y snap-mandatory scrollbar-hide"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {shorts.value.map((short, index) => (
          <div key={short.id} data-index={index} className="h-screen snap-start relative">
            <ShortVideo short={short} isActive={index === currentIndex.value} currentUser={user} />
          </div>
        ))}
      </div>

      {/* Navigation indicators */}
      {shorts.value.length > 1 && (
        <div className="fixed right-4 top-1/2 transform -translate-y-1/2 flex flex-col gap-2 z-20">
          {shorts.value.map((_, index) => (
            <button
              key={index}
              onClick={() => (currentIndex.value = index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex.value ? "bg-white" : "bg-white/50"
              }`}
              aria-label={`Go to short ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
