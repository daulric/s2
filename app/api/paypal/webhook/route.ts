import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { SupabaseClient } from "@supabase/supabase-js"
import { verifyWebhookSignature } from "@/lib/paypal"

const WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const headers: Record<string, string> = {}
    req.headers.forEach((value, key) => { headers[key] = value })

    if (WEBHOOK_ID) {
      const valid = await verifyWebhookSignature(headers, body, WEBHOOK_ID)
      if (!valid) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
      }
    }

    const event = JSON.parse(body)
    const eventType: string = event.event_type
    const resource = event.resource

    const supabase = (await createClient(req)) as SupabaseClient

    switch (eventType) {
      case "BILLING.SUBSCRIPTION.ACTIVATED": {
        const subId = resource.id
        await supabase
          .from("subscriptions")
          .update({
            status: "ACTIVE",
            current_period_end: resource.billing_info?.next_billing_time ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq("paypal_subscription_id", subId)
        break
      }

      case "BILLING.SUBSCRIPTION.SUSPENDED": {
        const subId = resource.id
        await supabase
          .from("subscriptions")
          .update({
            status: "SUSPENDED",
            updated_at: new Date().toISOString(),
          })
          .eq("paypal_subscription_id", subId)
        break
      }

      case "BILLING.SUBSCRIPTION.CANCELLED": {
        const subId = resource.id
        await supabase
          .from("subscriptions")
          .update({
            status: "CANCELLED",
            updated_at: new Date().toISOString(),
          })
          .eq("paypal_subscription_id", subId)
        break
      }

      case "BILLING.SUBSCRIPTION.EXPIRED": {
        const subId = resource.id
        await supabase
          .from("subscriptions")
          .update({
            status: "EXPIRED",
            updated_at: new Date().toISOString(),
          })
          .eq("paypal_subscription_id", subId)
        break
      }

      case "PAYMENT.SALE.COMPLETED": {
        const subId = resource.billing_agreement_id
        if (subId) {
          await supabase
            .from("subscriptions")
            .update({
              status: "ACTIVE",
              updated_at: new Date().toISOString(),
            })
            .eq("paypal_subscription_id", subId)
        }
        break
      }

      case "BILLING.SUBSCRIPTION.PAYMENT.FAILED": {
        const subId = resource.id
        await supabase
          .from("subscriptions")
          .update({
            status: "SUSPENDED",
            updated_at: new Date().toISOString(),
          })
          .eq("paypal_subscription_id", subId)
        break
      }

      default:
        break
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error("Webhook error:", err)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
