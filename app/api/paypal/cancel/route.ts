import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { SupabaseClient } from "@supabase/supabase-js"
import { cancelSubscription } from "@/lib/paypal"

export async function POST(req: NextRequest) {
  try {
    const supabase = (await createClient(req)) as SupabaseClient
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("paypal_subscription_id, status")
      .eq("user_id", user.id)
      .single()

    if (!sub || sub.status !== "ACTIVE") {
      return NextResponse.json({ error: "No active subscription found" }, { status: 404 })
    }

    await cancelSubscription(sub.paypal_subscription_id, "User requested cancellation")

    await supabase
      .from("subscriptions")
      .update({
        status: "CANCELLED",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)

    return NextResponse.json({ status: "CANCELLED" })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
