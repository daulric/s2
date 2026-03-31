"use client"

import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Users, Video, Calendar } from "lucide-react"
import { UserInfoProps } from "@/lib/user/data-to-user-format"
import { useWebHaptics } from "web-haptics/react"

interface UserCardProps {
  user: UserInfoProps
  size?: "default" | "compact"
  compact?: boolean
}

function formatCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`
  }
  return count.toString()
}

function formatJoinDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 30) {
    return `${diffDays} days ago`
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30)
    return `${months} month${months > 1 ? "s" : ""} ago`
  } else {
    const years = Math.floor(diffDays / 365)
    return `${years} year${years > 1 ? "s" : ""} ago`
  }
}

export function ProfileCard({ user, size = "default", compact = false }: UserCardProps) {
  const isCompact = size === "compact" || compact
  const { trigger } = useWebHaptics({debug: process.env.NODE_ENV !== "production"});
  
  if (isCompact) {
    return (
      <Link href={`/user/${user.id}`} onClick={() => trigger("light")}>
        <Card className="group cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.01]">
          <CardContent className="p-3">
            <div className="flex items-center space-x-3">
              {/* Avatar */}
              <Avatar className="h-12 w-12 flex-shrink-0 ring-1 ring-background group-hover:ring-primary/20 transition-all">
                <AvatarImage
                  src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                  alt={user.username}
                />
                <AvatarFallback className="text-sm font-semibold">
                  {user.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm group-hover:text-primary transition-colors truncate">
                  {user.username}
                </h3>

                {user.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{user.description}</p>
                )}

                {/* Stats */}
                <div className="flex items-center space-x-3 mt-1">
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    <span>{formatCount(user.subscriber_count)}</span>
                  </div>

                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                    <Video className="h-3 w-3" />
                    <span>{user.video_count}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    )
  }

  // Default size (original layout)
  return (
    <Link href={`/user/${user.id}`}>
      <Card className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02]">
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center space-y-4">
            {/* Avatar */}
            <Avatar className="h-20 w-20 ring-2 ring-background group-hover:ring-primary/20 transition-all">
              <AvatarImage
                src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                alt={user.username}
              />
              <AvatarFallback className="text-lg font-semibold">{user.username.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>

            {/* User Info */}
            <div className="space-y-2 w-full">
              <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">{user.username}</h3>

              {user.description && <p className="text-sm text-muted-foreground line-clamp-2">{user.description}</p>}
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between w-full pt-2 border-t">
              <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{formatCount(user.subscriber_count)}</span>
              </div>

              <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                <Video className="h-4 w-4" />
                <span>{user.video_count}</span>
              </div>
            </div>

            {/* Join Date */}
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>Joined {formatJoinDate(user.created_at)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}