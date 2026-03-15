"use server"

import { createClient } from "@/lib/supabase/server"
import converttoVideo, { type VideoData } from "@/lib/videos/data-to-video-format"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { ShortVideoData } from "@/components/scrolling-video/types"

export async function GetShortsData(): Promise<ShortVideoData[]> {
  const supabase = (await createClient()) as SupabaseClient
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from("videos")
    .select("*, video_likes(*)")

  if (error || !data) return []

  const shorts: ShortVideoData[] = []

  for (const short of data) {
    try {
      const formatted = await converttoVideo(supabase, short as VideoData, 3600)
      if (!formatted) continue

      let subscriberData = null
      let user_liked = false

      const { data: total_subs } = await supabase
        .from("subscribers")
        .select("*")
        .eq("vendor", formatted.creator_id)
        .eq("is_subscribed", true)

      if (user) {
        if (user.id !== formatted.creator_id) {
          const { data: dd } = await supabase
            .from("subscribers")
            .select("*")
            .eq("subscriber", user.id)
            .eq("vendor", formatted.creator_id)
            .single()

          if (dd) subscriberData = dd
        }

        const liked = short.video_likes.filter(
          (i: { userid: string; is_liked: boolean }) => i.userid === user.id && i.is_liked,
        )
        if (liked.length > 0) user_liked = true
      }

      shorts.push({
        ...formatted,
        likes: short.video_likes.filter((v: { is_liked: boolean }) => v.is_liked).length,
        is_liked: user_liked,
        is_subscribed: subscriberData?.is_subscribed ?? null,
        subscribers: total_subs ? total_subs.length : 0,
      })
    } catch {
      continue
    }
  }

  return shorts
}
