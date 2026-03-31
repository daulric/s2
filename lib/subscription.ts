import { createClient } from "@/lib/supabase/server"
import { SupabaseClient } from "@supabase/supabase-js"
import { NextRequest } from "next/server"

export type SubscriptionRecord = {
  user_id: string
  paypal_subscription_id: string
  plan_id: string
  status: string
  current_period_end: string | null
  paypal_email: string | null
}

export async function getSubscriptionForUser(
  userId: string,
  req?: NextRequest,
): Promise<SubscriptionRecord | null> {
  const supabase = (await createClient(req)) as SupabaseClient
  const { data } = await supabase
    .from("subscriptions")
    .select("user_id, paypal_subscription_id, plan_id, status, current_period_end, paypal_email")
    .eq("user_id", userId)
    .single()

  return data ?? null
}

export async function isUserSubscribed(
  userId: string,
  req?: NextRequest,
): Promise<boolean> {
  const sub = await getSubscriptionForUser(userId, req)
  return sub?.status === "ACTIVE"
}

export async function requireSubscription(
  req: NextRequest,
): Promise<{ subscribed: boolean; userId: string | null }> {
  const supabase = (await createClient(req)) as SupabaseClient
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { subscribed: false, userId: null }

  const subscribed = await isUserSubscribed(user.id, req)
  return { subscribed, userId: user.id }
}
