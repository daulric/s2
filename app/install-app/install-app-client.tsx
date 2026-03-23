"use client"

import Link from "next/link"
import { NonPwaOnly } from "@/components/system"
import { buttonVariants } from "@/components/ui/button-variants"
import { cn } from "@/lib/utils"
import { Smartphone, Share, PlusSquare } from "lucide-react"

export function InstallAppClient() {
  return (
    <NonPwaOnly
      redirectHref="/"
      fallback={
        <main className="min-h-dvh flex items-center justify-center p-6 text-muted-foreground text-sm">
          Loading…
        </main>
      }
    >
      <main className="flex min-h-dvh w-full flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg">
        <h1 className="text-2xl font-bold mb-2 text-center">Install s2</h1>
        <p className="text-muted-foreground mb-8 text-center text-pretty">
          This screen is only shown in your browser. Add the app to your home screen for a full-screen
          experience and quicker access.
        </p>

        <section className="space-y-6 mb-10 text-left">
          <div className="rounded-lg border bg-card p-4">
            <h2 className="font-semibold flex items-center gap-2 mb-2">
              <Smartphone className="h-5 w-5" aria-hidden />
              iPhone & iPad (Safari)
            </h2>
            <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-2">
              <li>
                Tap the <Share className="inline h-4 w-4 align-text-bottom mx-0.5" aria-hidden />{" "}
                <strong>Share</strong> button in Safari.
              </li>
              <li>
                Scroll and tap <strong>Add to Home Screen</strong>.
              </li>
              <li>
                Tap <strong>Add</strong>.
              </li>
            </ol>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <h2 className="font-semibold flex items-center gap-2 mb-2">
              <PlusSquare className="h-5 w-5" aria-hidden />
              Android (Chrome)
            </h2>
            <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-2">
              <li>
                Open the browser menu (<strong>⋮</strong>).
              </li>
              <li>
                Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.
              </li>
              <li>Confirm the install.</li>
            </ol>
          </div>
        </section>

        <div className="flex justify-center">
          <Link
            href="/"
            className={cn(buttonVariants({ variant: "outline", size: "default" }), "inline-flex")}
          >
            Back to s2
          </Link>
        </div>
        </div>
      </main>
    </NonPwaOnly>
  )
}
