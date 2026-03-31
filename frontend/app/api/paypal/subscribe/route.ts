import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { SupabaseClient } from "@supabase/supabase-js"
import { getSubscription } from "@/lib/paypal"

export async function POST(req: NextRequest) {
  try {
    const supabase = (await createClient(req)) as SupabaseClient
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { subscriptionId } = await req.json()
    if (!subscriptionId || typeof subscriptionId !== "string") {
      return NextResponse.json({ error: "Missing subscriptionId" }, { status: 400 })
    }

    const paypalSub = await getSubscription(subscriptionId)
    if (paypalSub.status !== "ACTIVE" && paypalSub.status !== "APPROVED") {
      return NextResponse.json(
        { error: `Subscription not active (status: ${paypalSub.status})` },
        { status: 400 },
      )
    }

    const { error } = await supabase.from("subscriptions").upsert(
      {
        user_id: user.id,
        paypal_subscription_id: subscriptionId,
        plan_id: paypalSub.plan_id,
        status: "ACTIVE",
        current_period_end: paypalSub.billing_info?.next_billing_time ?? null,
        paypal_email: paypalSub.subscriber?.email_address ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ status: "ACTIVE", subscriptionId })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
