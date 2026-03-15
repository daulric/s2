"use client"

import { useEffect, useRef } from "react"
import { useSignal } from "@preact/signals-react"
import { useAuth } from "@/context/AuthProvider"
import converttoVideo, { type VideoData } from "@/lib/videos/data-to-video-format"
import type { ShortVideoData } from "@/components/scrolling-video/types"

export function useShorts(initialData?: ShortVideoData[]) {
  const auth = useAuth()
  const user = auth?.user?.user
  const supabase = auth?.supabase

  const hasServerData = initialData && initialData.length > 0
  const shorts = useSignal<ShortVideoData[]>(hasServerData ? initialData : [])
  const isLoading = useSignal(!hasServerData)
  const hasFetched = useRef(!!hasServerData)

  useEffect(() => {
    if (!supabase || hasFetched.current) return
    hasFetched.current = true

    async function fetchShorts() {
      try {
        const { data, error } = await supabase.from("videos")
          .select("*, video_likes(*)")

        if (error || !data) return

        const formattedShorts: ShortVideoData[] = []

        for (const short of data) {
          try {
            const formattedShort = await converttoVideo(supabase, short as VideoData, 3600)
            if (!formattedShort) continue

            let subscriberData = null
            let user_liked = false

            const { data: total_subs } = await supabase
              .from("subscribers")
              .select("*")
              .eq("vendor", formattedShort.creator_id)
              .eq("is_subscribed", true)

            if (user) {
              if (user.id !== formattedShort.creator_id) {
                const { data: dd } = await supabase
                  .from("subscribers")
                  .select("*")
                  .eq("subscriber", user.id)
                  .eq("vendor", formattedShort.creator_id)
                  .single()

                if (dd) subscriberData = dd
              }

              const liked = short.video_likes.filter(
                (i: { userid: string; is_liked: boolean }) => i.userid === user.id && i.is_liked,
              )
              if (liked.length > 0) user_liked = true
            }

            formattedShorts.push({
              ...formattedShort,
              likes: short.video_likes.filter((v: { is_liked: boolean }) => v.is_liked).length,
              is_liked: user_liked,
              is_subscribed: subscriberData?.is_subscribed ?? null,
              subscribers: total_subs ? total_subs.length : 0,
            })
          } catch (err) {
            throw err
          }
        }

        shorts.value = formattedShorts
      } finally {
        isLoading.value = false
      }
    }

    fetchShorts()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, user])

  return { shorts, isLoading, user }
}
