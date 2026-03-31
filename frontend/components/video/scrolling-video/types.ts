import type { VideoInfoProps } from "@/lib/videos/data-to-video-format"

export interface ShortVideoData extends VideoInfoProps {
  likes?: number
  is_liked?: boolean
  is_subscribed?: boolean | null
  subscribers?: number
}
