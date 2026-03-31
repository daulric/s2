import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { SupabaseClient } from "@supabase/supabase-js"

const PAYPAL_BASE = process.env.PAYPAL_MODE === "live"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com"

console.log("PAYPAL_BASE", PAYPAL_BASE)

async function getAccessToken(): Promise<string> {
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  })
  const json = await res.json()
  return json.access_token
}

export async function POST(req: NextRequest) {
  try {
    const supabase = (await createClient(req)) as SupabaseClient
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const origin = req.headers.get("origin") || "http://localhost:3000"
    const token = await getAccessToken()

    const subRes = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        plan_id: process.env.PAYPAL_PLAN_ID,
        application_context: {
          brand_name: "s2",
          user_action: "SUBSCRIBE_NOW",
          return_url: `${origin}/pricing?subscription=success`,
          cancel_url: `${origin}/pricing?subscription=cancelled`,
        },
      }),
    })

    if (!subRes.ok) {
      const text = await subRes.text()
      return NextResponse.json({ error: text }, { status: subRes.status })
    }

    const subscription = await subRes.json()
    const approveLink = subscription.links?.find(
      (l: { rel: string }) => l.rel === "approve",
    )

    return NextResponse.json({
      subscriptionId: subscription.id,
      approveUrl: approveLink?.href ?? null,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
