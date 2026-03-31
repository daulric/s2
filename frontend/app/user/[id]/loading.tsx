export default function Loading() {
  return (
    <main className="min-h-screen pt-20 p-4 bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="animate-pulse">
          {/* Profile Header Skeleton */}
          <div className="bg-muted rounded-lg p-6 mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="h-24 w-24 sm:h-32 sm:w-32 bg-muted-foreground/20 rounded-full"></div>
              <div className="flex-1 space-y-3">
                <div className="h-8 bg-muted-foreground/20 rounded w-48"></div>
                <div className="h-4 bg-muted-foreground/20 rounded w-96"></div>
                <div className="h-4 bg-muted-foreground/20 rounded w-64"></div>
              </div>
              <div className="h-10 w-24 bg-muted-foreground/20 rounded"></div>
            </div>
          </div>

          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded-lg"></div>
            ))}
          </div>

          {/* Content Skeleton */}
          <div className="bg-muted rounded-lg p-6">
            <div className="h-6 bg-muted-foreground/20 rounded w-32 mb-4"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <div className="h-40 bg-muted-foreground/20 rounded"></div>
                  <div className="h-4 bg-muted-foreground/20 rounded"></div>
                  <div className="h-3 bg-muted-foreground/20 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}