"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Play } from "lucide-react"
import Image from "next/image"

import { VideoInfoProps } from "@/lib/videos/data-to-video-format"
import { SupabaseClient } from "@supabase/supabase-js"
import { useSignals, useSignal } from "@preact/signals-react/runtime"
import { useEffect } from "react"

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
  supabase?: SupabaseClient<any,string, any>
}

const globalCache = new Map<string, Blob>()

export async function getImage( video: VideoProps, supabase: SupabaseClient<any, string, any> ) {
  if (supabase && video.id && video.thumbnail_path) {
    if (!globalCache.has(video.thumbnail_path)) {

      const { data, error } = await supabase.storage
        .from("images")
        .download(video.thumbnail_path || "");
  
      if (error) {
        return null
      }

      if (data){
        globalCache.set(video.thumbnail_path, data);
        return URL.createObjectURL(data)
      };
    } else {
      const cached_file = globalCache.get(video.thumbnail_path);
      return cached_file && URL.createObjectURL(cached_file);
    }

  }
}

export function VideoCard({ video, compact = false,  supabase }: VideoCardProps) {
  useSignals();
  const thumbURL = useSignal<string | null>(null);

  useEffect(() => {
    if (video.thumbnail_path && supabase) {
      const videoForImage: VideoProps =
        typeof video.views === "number"
          ? { ...video, views: video.views.toString() }
          : (video as VideoProps);
      
      (async () => {
        let uri = await getImage(videoForImage, supabase);

        if (uri) {
          thumbURL.value = uri;
        }
      })()
    }
  }, [])

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
                  loading="lazy"
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
              loading="lazy"
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