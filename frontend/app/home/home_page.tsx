"use client"

import Link from "next/link"
import { useAuth } from "@/context/AuthProvider"
import { useSubscription } from "@/context/SubscriptionProvider"
import { VideoCard } from "@/components/video"
import { StockCard } from "@/components/stocks"
import { VideoInfoProps } from "@/lib/videos/data-to-video-format"
import { AudioInfoProps } from "@/lib/audios/data-to-audio-format"
import type { StockWithPrediction } from "@/lib/stocks/types"
import {
  Zap,
  ChevronRight,
  Music,
  TrendingUp,
  Headphones,
  Video,
  Users,
} from "lucide-react"

type HomePageProps = {
  isGuest?: boolean
  trendingVideos?: VideoInfoProps[]
  guestAudios?: AudioInfoProps[]
  myVideos?: VideoInfoProps[]
  subVideos?: VideoInfoProps[]
  isPremium?: boolean
  stocks?: StockWithPrediction[]
  hasWatchlist?: boolean
  audios?: AudioInfoProps[]
}

function FeedSection({
  title,
  icon: Icon,
  href,
  children,
}: {
  title: string
  icon?: React.ComponentType<{ className?: string }>
  href?: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
          {title}
        </h2>
        {href && (
          <Link
            href={href}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5"
          >
            see all
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}

function ScrollRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border">
      {children}
    </div>
  )
}

function AudioCard({ audio }: { audio: AudioInfoProps }) {
  return (
    <Link
      href={`/music?id=${audio.id}`}
      className="group shrink-0 w-44"
    >
      <div className="relative aspect-square rounded-xl overflow-hidden bg-muted mb-2">
        {audio.thumbnail && audio.thumbnail !== "/placeholder.png" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={audio.thumbnail}
            alt={audio.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-primary/5">
            <Music className="h-10 w-10 text-muted-foreground" />
          </div>
        )}
      </div>
      <p className="text-sm font-medium truncate">{audio.title}</p>
      <p className="text-xs text-muted-foreground truncate">
        {audio.username}
        {audio.listens > 0 && ` · ${audio.listens.toLocaleString()} listens`}
      </p>
    </Link>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
      {message}
    </div>
  )
}

export default function HomePage({
  isGuest,
  trendingVideos = [],
  guestAudios = [],
  myVideos = [],
  subVideos = [],
  isPremium,
  stocks = [],
  hasWatchlist,
  audios = [],
}: HomePageProps) {
  const auth = useAuth()
  const profile = auth?.user?.profile
  const supabase = auth?.supabase
  const { subscribed } = useSubscription()

  if (isGuest) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">hello guest</h1>
          <p className="text-muted-foreground mt-1">sign in to get a personalized feed</p>
        </div>

        <FeedSection title="trending videos" icon={Video} href="/home">
          {trendingVideos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {trendingVideos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          ) : (
            <EmptyState message="no videos yet" />
          )}
        </FeedSection>

        {guestAudios.length > 0 && (
          <FeedSection title="listen" icon={Headphones} href="/music">
            <ScrollRow>
              {guestAudios.map((audio) => (
                <AudioCard key={audio.id} audio={audio} />
              ))}
            </ScrollRow>
          </FeedSection>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          hello {profile?.username?.toLowerCase() || "there"}
          {subscribed && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              <Zap className="h-3 w-3 fill-primary" />
              s2+
            </span>
          )}
        </h1>
      </div>

      {isPremium && (
        <FeedSection
          title={hasWatchlist ? "your watchlist" : "top stocks"}
          icon={TrendingUp}
          href="/stocks"
        >
          {stocks.length > 0 ? (
            <ScrollRow>
              {stocks.map((stock) => (
                <div key={stock.ticker} className="shrink-0 w-56">
                  <StockCard stock={stock} />
                </div>
              ))}
            </ScrollRow>
          ) : (
            <EmptyState message="no stocks to show — add tickers to your watchlist" />
          )}
        </FeedSection>
      )}

      <FeedSection title="your videos" icon={Video} href={profile ? `/user/${profile.id}` : undefined}>
        {myVideos.length > 0 ? (
          <ScrollRow>
            {myVideos.map((video) => (
              <div key={video.id} className="shrink-0 w-64">
                {supabase ? <VideoCard video={video} supabase={supabase} /> : <VideoCard video={video} />}
              </div>
            ))}
          </ScrollRow>
        ) : (
          <EmptyState message="you haven&apos;t uploaded any videos yet" />
        )}
      </FeedSection>

      <FeedSection title="from your subscriptions" icon={Users}>
        {subVideos.length > 0 ? (
          <ScrollRow>
            {subVideos.map((video) => (
              <div key={video.id} className="shrink-0 w-64">
                {supabase ? <VideoCard video={video} supabase={supabase} /> : <VideoCard video={video} />}
              </div>
            ))}
          </ScrollRow>
        ) : (
          <EmptyState message="subscribe to creators to see their latest videos here" />
        )}
      </FeedSection>

      {isPremium && audios.length > 0 && (
        <FeedSection title="music for you" icon={Headphones} href="/music">
          <ScrollRow>
            {audios.map((audio) => (
              <AudioCard key={audio.id} audio={audio} />
            ))}
          </ScrollRow>
        </FeedSection>
      )}
    </div>
  )
}
