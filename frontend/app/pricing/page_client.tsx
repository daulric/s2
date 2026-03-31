"use client"

import { useAuth } from "@/context/AuthProvider"
import { useSubscription } from "@/context/SubscriptionProvider"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Check,
  X,
  Zap,
  Globe,
  TrendingUp,
  Shield,
  Video,
  Music,
  Headphones,
  Upload,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { backendFetch } from "@/lib/backend-fetch"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useSignal, useSignals } from "@preact/signals-react/runtime"
import { useEffect } from "react"
import { toast } from "sonner"

const FREE_FEATURES = [
  { text: "Browse videos and shorts", included: true },
  { text: "Stream music", included: true },
  { text: "US stock predictions (NYSE & Nasdaq)", included: true },
  { text: "News sentiment analysis", included: true },
  { text: "Basic watchlist", included: true },
  { text: "Upload videos and music", included: true },
  { text: "Ad-free video and music playback", included: false },
  { text: "Live stock data from all exchanges", included: false },
  { text: "High-quality audio streaming", included: false },
  { text: "Priority uploads and processing", included: false },
  { text: "Early access to new features", included: false },
]

const PLUS_FEATURES = [
  { text: "Everything in Free", included: true },
  { text: "Ad-free video and music playback", included: true },
  { text: "Live stock data from all exchanges", included: true },
  { text: "Real-time EU & ECSE prices", included: true },
  { text: "High-quality audio streaming", included: true },
  { text: "Priority uploads and processing", included: true },
  { text: "Advanced sentiment scoring", included: true },
  { text: "Extended market hours data", included: true },
  { text: "Early access to new features", included: true },
]

const HIGHLIGHTS = [
  {
    icon: Video,
    title: "Ad-free experience",
    description: "Watch videos and shorts without interruptions across the entire platform",
  },
  {
    icon: Globe,
    title: "Global stock data",
    description: "Live prices from NYSE, Nasdaq, FTSE 100, CAC 40, DAX 40, AEX 25, and ECSE",
  },
  {
    icon: Headphones,
    title: "High-quality audio",
    description: "Stream music at higher bitrates for a richer listening experience",
  },
  {
    icon: TrendingUp,
    title: "Smarter Predictions",
    description: "Priority sentiment analysis with faster refresh cycles for stock predictions",
  },
  {
    icon: Upload,
    title: "Priority Uploads",
    description: "Faster video and music processing so your content goes live sooner",
  },
  {
    icon: Shield,
    title: "Early access",
    description: "Be the first to try new features before they roll out to everyone",
  },
]

function SubscribeButton() {
  useSignals()
  const loading = useSignal(false)

  const handleSubscribe = async () => {
    loading.value = true
    try {
      const res = await backendFetch("/paypal/create-subscription", { method: "POST" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to create subscription")
      if (json.approveUrl) {
        sessionStorage.setItem("pending_subscription_id", json.subscriptionId)
        window.location.href = json.approveUrl
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
      loading.value = false
    }
  }

  return (
    <Button className="w-full mb-6" onClick={handleSubscribe} disabled={loading.value}>
      {loading.value ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <Zap className="h-4 w-4 mr-2" />
      )}
      {loading.value ? "redirecting to paypal..." : "upgrade to s2+"}
    </Button>
  )
}

function ActiveSubscriptionCard({
  currentPeriodEnd,
  onCancel,
}: {
  currentPeriodEnd: string | null
  onCancel: () => void
}) {
  useSignals()
  const cancelling = useSignal(false)

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel your s2+ subscription?")) return
    cancelling.value = true
    try {
      const res = await backendFetch("/paypal/cancel", { method: "POST" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to cancel")
      toast.success("Subscription cancelled")
      onCancel()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      cancelling.value = false
    }
  }

  return (
    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 mb-3">
        <Check className="h-3 w-3 mr-1" /> active
      </Badge>
      <h3 className="text-lg font-semibold mb-1">you&apos;re on s2+</h3>
      {currentPeriodEnd && (
        <p className="text-sm text-muted-foreground mb-4">
          next billing: {new Date(currentPeriodEnd).toLocaleDateString()}
        </p>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={handleCancel}
        disabled={cancelling.value}
      >
        {cancelling.value ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
        cancel subscription
      </Button>
    </div>
  )
}

export default function PricingPage() {
  const { user: { user } } = useAuth()
  const { subscribed, currentPeriodEnd, refresh } = useSubscription()
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const subStatus = searchParams.get("subscription")
    const subId = searchParams.get("subscription_id")
      || sessionStorage.getItem("pending_subscription_id")

    if (subStatus === "success" && subId) {
      sessionStorage.removeItem("pending_subscription_id")
      backendFetch("/paypal/subscribe", {
        method: "POST",
        body: JSON.stringify({ subscriptionId: subId }),
      })
        .then(r => r.json())
        .then(json => {
          if (json.status === "ACTIVE") {
            toast.success("welcome to s2+!")
          } else {
            toast.info("subscription is being processed")
          }
          refresh()
        })
        .catch(() => toast.error("failed to activate subscription"))
        .finally(() => router.replace("/pricing"))
    } else if (subStatus === "cancelled") {
      sessionStorage.removeItem("pending_subscription_id")
      toast.info("subscription cancelled")
      router.replace("/pricing")
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
      <main className="min-h-screen pt-15 p-4 pb-16 bg-background">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">pricing</Badge>
            <h1 className="text-4xl font-bold tracking-tight mb-3">
              one plan, everything upgraded
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              s2 is free to use. upgrade to
              <span className="font-semibold text-foreground"> s2+ </span>
              for ad-free playback, live global stock data, high-quality audio, and more.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-16">
            <Card className="relative">
              <CardHeader>
                <CardTitle className="text-xl">Free</CardTitle>
                <CardDescription>
                  videos, music, and stock predictions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <span className="text-4xl font-bold">$0</span>
                  <span className="text-muted-foreground ml-1">/month</span>
                </div>

                <Link href={user ? "/home" : "/auth"}>
                  <Button variant="outline" className="w-full mb-6">
                    {user ? "browse s2" : "get started"}
                  </Button>
                </Link>

                <Separator className="mb-6" />

                <ul className="space-y-3">
                  {FREE_FEATURES.map((f) => (
                    <li key={f.text} className="flex items-start gap-2.5">
                      {f.included ? (
                        <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground/40 mt-0.5 shrink-0" />
                      )}
                      <span className={cn(
                        "text-sm",
                        !f.included && "text-muted-foreground/50",
                      )}>
                        {f.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="relative overflow-visible ring-2 ring-primary/20">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="shadow-md">recommended</Badge>
              </div>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xl">s2+</CardTitle>
                  <Zap className="h-4 w-4 text-primary" />
                </div>
                <CardDescription>
                  the full s2 experience, upgraded
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <span className="text-4xl font-bold">$5</span>
                  <span className="text-muted-foreground ml-1">/month</span>
                </div>

                {!user ? (
                  <Link href="/auth">
                    <Button className="w-full mb-6">
                      <Zap className="h-4 w-4 mr-2" />
                      get started with s2+
                    </Button>
                  </Link>
                ) : subscribed ? (
                  <ActiveSubscriptionCard
                    currentPeriodEnd={currentPeriodEnd}
                    onCancel={refresh}
                  />
                ) : (
                  <SubscribeButton />
                )}

                <Separator className="my-6" />

                <ul className="space-y-3">
                  {PLUS_FEATURES.map((f) => (
                    <li key={f.text} className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                      <span className="text-sm">{f.text}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="mb-16">
            <h2 className="text-2xl font-bold text-center mb-8">
              what you get with s2+
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {HIGHLIGHTS.map((h) => (
                <div
                  key={h.title}
                  className="flex gap-4 rounded-lg border bg-card p-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <h.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-0.5">{h.title}</h3>
                    <p className="text-sm text-muted-foreground">{h.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6 text-center">
            <h2 className="text-lg font-semibold mb-2">frequently asked</h2>
            <div className="max-w-2xl mx-auto text-left space-y-4 mt-4">
              <div>
                <h3 className="font-medium text-sm mb-1">can I cancel anytime?</h3>
                <p className="text-sm text-muted-foreground">
                  yes. cancel your subscription at any time and you&apos;ll keep access through the end of your billing period.
                </p>
              </div>
              <Separator />
              <div>
                <h3 className="font-medium text-sm mb-1">what does s2+ include?</h3>
                <p className="text-sm text-muted-foreground">
                  ad-free video and music playback, live stock data from all global exchanges (NYSE, Nasdaq, FTSE 100, CAC 40, DAX 40, AEX 25, ECSE), high-quality audio streaming, priority uploads, and early access to new features.
                </p>
              </div>
              <Separator />
              <div>
                <h3 className="font-medium text-sm mb-1">do I need s2+ to use the platform?</h3>
                <p className="text-sm text-muted-foreground">
                  no. browsing videos, listening to music, uploading content, and US stock predictions are all free. s2+ enhances the experience across the board.
                </p>
              </div>
              <Separator />
              <div>
                <h3 className="font-medium text-sm mb-1">what payment methods do you accept?</h3>
                <p className="text-sm text-muted-foreground">
                  you can pay with PayPal or directly with a debit or credit card (Visa, Mastercard, Amex, Discover). choose your preferred method when subscribing.
                </p>
              </div>
              <Separator />
              <div>
                <h3 className="font-medium text-sm mb-1">how do I manage my subscription?</h3>
                <p className="text-sm text-muted-foreground">
                  you can cancel directly from this page when signed in. your access continues through the end of the current billing period.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
  )
}
