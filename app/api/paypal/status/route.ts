import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { SupabaseClient } from "@supabase/supabase-js"

export async function GET(req: NextRequest) {
  try {
    const supabase = (await createClient(req)) as SupabaseClient
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ subscribed: false, status: null })
    }

    const { data } = await supabase
      .from("subscriptions")
      .select("status, plan_id, current_period_end, paypal_subscription_id")
      .eq("user_id", user.id)
      .single()

    if (!data) {
      return NextResponse.json({ subscribed: false, status: null })
    }

    return NextResponse.json({
      subscribed: data.status === "ACTIVE",
      status: data.status,
      planId: data.plan_id,
      currentPeriodEnd: data.current_period_end,
      paypalSubscriptionId: data.paypal_subscription_id,
    })
  } catch {
    return NextResponse.json({ subscribed: false, status: null })
  }
}
