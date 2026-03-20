import type { SupabaseClient, User } from "@supabase/supabase-js"
import converttoVideo, { type VideoData } from "@/lib/videos/data-to-video-format"
import type { ShortVideoData } from "@/components/scrolling-video/types"

const parsed = Number(process.env.NEXT_PUBLIC_SHORTS_FEED_PAGE_SIZE)

export const SHORTS_FEED_LIMIT = Number.isFinite(parsed) && parsed > 0 ? Math.min(Math.floor(parsed), 100) : 10

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
}

export type FetchShortsFeedOptions = {
  limit?: number
  excludeVideoIds?: string[]
}

export async function fetchShortsFeed(
  supabase: SupabaseClient<any, string, any>,
  user: User | null,
  options?: FetchShortsFeedOptions,
): Promise<ShortVideoData[]> {
  const limit = options?.limit ?? SHORTS_FEED_LIMIT
  const exclude = new Set(options?.excludeVideoIds ?? [])
  /** Recent rows to randomize within (avoids `ORDER BY random()` + offset issues). */
  const poolSize = Math.min(800, Math.max(limit * 40, 80))

  const { data: rawRows, error } = await supabase
    .from("videos")
    .select("*, video_likes(userid, is_liked)")
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(poolSize)

  if (error || !rawRows?.length) return []

  const candidates = rawRows.filter((row) => {
    const id = (row as VideoData).video_id
    return id && !exclude.has(id)
  })

  shuffleInPlace(candidates)
  const page = candidates.slice(0, limit)

  const formatted = await Promise.all(
    page.map(async (short) => {
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
    const likesRows = raw.video_likes ?? []
    const user_liked = user
      ? likesRows.some(
          (i: { userid: string; is_liked: boolean }) => i.userid === user.id && i.is_liked,
        )
      : false

    return {
      ...vid,
      likes: likesRows.filter((v: { is_liked: boolean }) => v.is_liked).length,
      is_liked: user_liked,
      is_subscribed: user ? (userSubMap.get(vid.creator_id) ?? null) : null,
      subscribers: subCountMap.get(vid.creator_id) ?? 0,
    }
  })
}
