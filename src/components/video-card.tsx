import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Play } from "lucide-react"
import Image from "next/image"

import { VideoInfoProps } from "@/lib/videos/data-to-video-format"

export type VideoProps = {
  id: string
  title: string
  thumbnail: string
  views: string
  uploadDate: string
  username: string
}

type VideoCardProps = {
  video: VideoInfoProps | VideoProps
  compact?: boolean
}

export function VideoCard({ video, compact = false }: VideoCardProps) {
  if (compact) {
    return (
      <Link href={`/video/${video.id}`}>
        <Card className="overflow-hidden">
          <div className="flex">
            <div className="relative w-40 h-24 flex-shrink-0">
              <Image
                src={video.thumbnail}
                alt={video.title}
                className="w-full h-full object-cover"
                width={1000}
                height={1000}
              />
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
    <Card className="overflow-hidden">
      <div className="relative">
        <Image src={video.thumbnail} width={1000} height={1000} alt={video.title} className="w-full h-40 object-cover" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/30">
          <Link href={`/video/${video.id}`}>
            <Button size="icon" variant="secondary" className="rounded-full h-12 w-12">
              <Play className="h-6 w-6" />
            </Button>
          </Link>
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
  )
}