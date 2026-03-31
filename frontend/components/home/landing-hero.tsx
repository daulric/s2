import Image from "next/image"
import { HomeLandingClient } from "./home-landing-client"

export function LandingHero() {
  return (
    <section className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center overflow-hidden px-4 py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-primary/5 blur-3xl dark:bg-primary/10"
      />

      <div className="relative z-[1] w-full max-w-2xl mx-auto text-center">
        <div className="animate-fade-in-up mb-6">
          <Image
            src="/logo.jpeg"
            width={64}
            height={64}
            alt="s2 logo"
            className="rounded-xl mx-auto shadow-lg"
          />
        </div>

        <h1 className="animate-fade-in-up-delay-1 text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-balance leading-tight">
          everything, one platform
        </h1>

        <p className="animate-fade-in-up-delay-2 mt-4 text-lg sm:text-xl text-foreground/60 max-w-lg mx-auto text-balance">
          videos, music, stocks, and social — built for people who want more from the web.
        </p>

        <div className="animate-fade-in-up-delay-3 mt-8">
          <HomeLandingClient />
        </div>
      </div>

      <div
        aria-hidden
        className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent"
      />
    </section>
  )
}
