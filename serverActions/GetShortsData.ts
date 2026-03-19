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

  const formatted = await Promise.all(
    data.map(async (short) => {
      try {
        const vid = await converttoVideo(supabase, short as VideoData, 3600)
        return vid ? { raw: short, vid } : null
      } catch {
        return null
      }
    }),
  )

  const valid = formatted.filter((v): v is NonNullable<typeof v> => v !== null)
  if (valid.length === 0) return []

  const creatorIds = [...new Set(valid.map((v) => v.vid.creator_id))]

  const { data: allSubs } = await supabase
    .from("subscribers")
    .select("vendor, subscriber, is_subscribed")
    .in("vendor", creatorIds)
    .eq("is_subscribed", true)

  const subCountMap = new Map<string, number>()
  const userSubMap = new Map<string, boolean>()

  for (const sub of allSubs ?? []) {
    subCountMap.set(sub.vendor, (subCountMap.get(sub.vendor) ?? 0) + 1)
    if (user && sub.subscriber === user.id) {
      userSubMap.set(sub.vendor, sub.is_subscribed)
    }
  }

  return valid.map(({ raw, vid }) => {
    const user_liked = user
      ? raw.video_likes.some((i: { userid: string; is_liked: boolean }) => i.userid === user.id && i.is_liked)
      : false

    return {
      ...vid,
      likes: raw.video_likes.filter((v: { is_liked: boolean }) => v.is_liked).length,
      is_liked: user_liked,
      is_subscribed: user ? (userSubMap.get(vid.creator_id) ?? null) : null,
      subscribers: subCountMap.get(vid.creator_id) ?? 0,
    }
  })
}
