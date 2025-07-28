import { LoadingSpinner } from "@/components/loading-spinner"

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size="lg" />
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Please wait while we load the content</p>
        </div>
      </div>
    </div>
  )
}