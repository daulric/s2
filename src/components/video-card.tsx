import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Play } from "lucide-react"
import Image from "next/image"

import { VideoInfoProps } from "@/lib/videos/data-to-video-format"
import { SupabaseClient } from "@supabase/supabase-js"
import { useSignals, useSignal } from "@preact/signals-react/runtime"
import { type Signal } from "@preact/signals-react"

export type VideoProps = {
  id: string
  title: string
  thumbnail: string
  views: string
  uploadDate: string
  username: string
  thumbnail_path?: string | null
}

type VideoCardProps = {
  video: VideoInfoProps | VideoProps
  compact?: boolean
  quick_load?: boolean
  supabase?: SupabaseClient<any,string, any>
}

export async function getImage(
  video: VideoProps,
  supabase: SupabaseClient<any, string, any>,
  ref: Signal<File | null>
) {
  if (supabase) {
    if (!ref.value) {
      const { data, error } = await supabase.storage
        .from("images")
        .download(video.thumbnail_path || "");

      if (error) {
        return null
      }

      ref.value = data as File;
    }

    return URL.createObjectURL(ref.value);
  }
}

export function VideoCard({ video, compact = false, quick_load = false, supabase }: VideoCardProps) {
  useSignals();
  const _ref = useSignal(null);
  const thumbURL = useSignal<string>("");

  if (video.thumbnail_path && supabase) {
    const videoForImage: VideoProps =
      typeof video.views === "number"
        ? { ...video, views: video.views.toString() }
        : (video as VideoProps);
    
    (async () => {
      if (!_ref.value) {
        let uri = await getImage(videoForImage, supabase, _ref);
        if (uri) {
          thumbURL.value = uri;
        }
      }
    })()
  }

  if (compact) {
    return (
      <Link href={`/video/${video.id}`}>
        <Card className="overflow-hidden">
          <div className="flex">
            <div className="relative w-40 h-24 flex-shrink-0">
              { thumbURL.value && thumbURL.value.length > 0 && (
                <Image
                  src={thumbURL.value}
                  alt={video.title}
                  className="w-full h-full object-cover"
                  width={1000}
                  height={1000}
                  loading={quick_load ? "eager" : "lazy"}
                  onLoad={() => { if (thumbURL.value) URL.revokeObjectURL(thumbURL.value) }}
                />
              )}
            </div>
            <CardContent className="p-3 flex-1">
              <h4 className="font-medium text-sm line-clamp-2">{video.title}</h4>
              <div className="mt-1 text-xs text-muted-foreground">
                <div>{video.username}</div>
                <div>
                  {video.views} views • {video.uploadDate}
                </div>
              </div>
            </CardContent>
          </div>
        </Card>
      </Link>
    )
  }

  return (
    <Link href={`/video/${video.id}`}>
      <Card className="overflow-hidden">
        <div className="relative">
          { thumbURL.value && thumbURL.value.length > 0 && (
            <Image 
              src={thumbURL.value}
              width={1000} height={1000}
              alt={video.title}
              className="w-full h-40 object-cover"
              loading={quick_load ? "eager" : "lazy"}
              onLoad={() => { if (thumbURL.value) URL.revokeObjectURL(thumbURL.value) }}
            />
          )}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/30">
              <Button size="icon" variant="secondary" className="rounded-full h-12 w-12">
                <Play className="h-6 w-6" />
              </Button>
          </div>
        </div>
        <CardContent className="p-3">
          <h3 className="font-medium line-clamp-2 mb-1">{video.title}</h3>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{video.username}</span>
            <span>{video.views} views</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">{video.uploadDate}</div>
        </CardContent>
      </Card>
    </Link>
  )
}