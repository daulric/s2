import { HomeLandingClient } from "@/components/home-landing-client"

/** Hero is sync server output; auth + CTAs are client-only (no Supabase on the critical path). */
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md mx-auto text-center">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-balance">
            a better experience
          </h1>
          <p className="text-muted-foreground mt-2">you an unknown entity</p>
          <p className="text-muted-foreground mt-2">choose one move forward</p>
        </div>
        <HomeLandingClient />
      </div>
    </main>
  )
}
