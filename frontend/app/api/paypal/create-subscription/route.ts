import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { SupabaseClient } from "@supabase/supabase-js"
import { getAccessToken, getPayPalBase, getPlanId } from "@/lib/paypal"

export async function POST(req: NextRequest) {
  try {
    const supabase = (await createClient(req)) as SupabaseClient
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const origin = req.headers.get("origin") || "http://localhost:3000"
    const token = await getAccessToken()

    const subRes = await fetch(`${getPayPalBase()}/v1/billing/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        plan_id: getPlanId(),
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
