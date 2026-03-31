import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

/** Generic page: title, subtitle, content blocks (most app routes). */
export function DefaultPageSkeleton({ className }: { className?: string }) {
  return (
    <main className={cn("min-h-screen pt-15 p-4 pb-8 bg-background", className)}>
      <div className="max-w-5xl mx-auto w-full space-y-6">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-full max-w-lg" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-40 rounded-lg" />
          <Skeleton className="h-40 rounded-lg" />
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    </main>
  )
}

/** Wider main column (search, wide lists). */
export function WidePageSkeleton() {
  return (
    <main className="min-h-screen pt-15 p-4 pb-8 bg-background">
      <div className="max-w-6xl mx-auto w-full space-y-6">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-10 w-full max-w-xl" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </main>
  )
}

/** `/` landing hero + actions. */
export function CenteredLandingSkeleton() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md mx-auto text-center space-y-4">
        <Skeleton className="h-10 w-full max-w-xs mx-auto" />
        <Skeleton className="h-4 w-3/4 mx-auto" />
        <Skeleton className="h-4 w-2/3 mx-auto" />
        <div className="flex flex-col gap-2 pt-4">
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </div>
    </main>
  )
}

/** `/home` video grid. */
export function HomeFeedSkeleton() {
  return (
    <main className="min-h-screen pt-15 p-4 bg-background">
      <div className="max-w-6xl mx-auto">
        <Skeleton className="h-9 w-48 mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-video w-full rounded-lg" />
          ))}
        </div>
      </div>
    </main>
  )
}

/** `/stocks` list + filters + grid of stock cards. */
export function StocksPageSkeleton() {
  return (
    <main className="min-h-screen pt-15 p-4 pb-8 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <Skeleton className="h-9 w-56" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <Skeleton className="h-4 w-full max-w-xl mt-2" />
        </div>

        <Card className="mb-6 border bg-card p-4">
          <div className="flex gap-2">
            <Skeleton className="h-4 w-4 shrink-0 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-[85%]" />
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-lg border bg-card p-3 text-center space-y-2">
              <Skeleton className="h-8 w-16 mx-auto" />
              <Skeleton className="h-3 w-14 mx-auto" />
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-4">
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <Skeleton className="h-10 flex-1 rounded-md" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20 rounded-md" />
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-14 rounded-md" />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-20 rounded-full" />
          ))}
        </div>

        <Skeleton className="h-4 w-32 mb-3" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between gap-2">
                  <div className="space-y-2 flex-1 min-w-0">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-3 w-36 max-w-full" />
                  </div>
                  <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                </div>
                <div className="flex items-baseline gap-2">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-4 w-14" />
                </div>
                <Skeleton className="h-9 w-full rounded-md" />
                <Skeleton className="h-16 w-full rounded-lg" />
                <div className="flex justify-between pt-1">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  )
}

/** `/stocks/[ticker]` detail layout. */
export function StockDetailPageSkeleton() {
  return (
    <main className="min-h-screen pt-15 p-4 pb-8 bg-background">
      <div className="max-w-5xl mx-auto">
        <Skeleton className="h-4 w-36 mb-4" />
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-9 w-28" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <Skeleton className="h-4 w-64 max-w-full" />
          </div>
          <Skeleton className="h-9 w-24 rounded-md shrink-0" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-3 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Skeleton className="h-72 w-full rounded-lg mb-6" />
        <Skeleton className="h-48 w-full rounded-lg mb-6" />
        <div className="space-y-3">
          <Skeleton className="h-6 w-40" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </main>
  )
}

/** `/video/[videoId]` player + sidebar. */
export function VideoDetailSkeleton() {
  return (
    <main className="min-h-screen pt-15 p-4 pb-8 bg-background">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="aspect-video w-full rounded-lg" />
          <Skeleton className="h-8 w-3/4 max-w-xl" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full max-w-2xl" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-20 w-32 shrink-0 rounded-md" />
              <div className="flex-1 space-y-2 py-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}

/** Music / upload-style list of rows. */
export function MediaListPageSkeleton() {
  return (
    <main className="min-h-screen pt-15 p-4 pb-8 bg-background">
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-9 w-40" />
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </main>
  )
}
