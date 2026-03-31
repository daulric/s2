const PAYPAL_BASE = process.env.PAYPAL_MODE === "live"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com"

async function getAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID
  const secret = process.env.PAYPAL_SECRET
  if (!clientId || !secret) throw new Error("Missing PayPal credentials")

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`PayPal auth failed (${res.status}): ${text}`)
  }

  const json = await res.json()
  return json.access_token
}

export type PayPalSubscriptionStatus =
  | "APPROVAL_PENDING"
  | "APPROVED"
  | "ACTIVE"
  | "SUSPENDED"
  | "CANCELLED"
  | "EXPIRED"

export type PayPalSubscription = {
  id: string
  status: PayPalSubscriptionStatus
  plan_id: string
  subscriber?: {
    email_address?: string
    name?: { given_name?: string; surname?: string }
  }
  billing_info?: {
    next_billing_time?: string
    last_payment?: {
      amount?: { value: string; currency_code: string }
      time?: string
    }
  }
  create_time: string
  update_time: string
}

export async function getSubscription(subscriptionId: string): Promise<PayPalSubscription> {
  const token = await getAccessToken()
  const res = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions/${subscriptionId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`PayPal getSubscription failed (${res.status}): ${text}`)
  }
  return res.json()
}

export async function cancelSubscription(subscriptionId: string, reason: string): Promise<void> {
  const token = await getAccessToken()
  const res = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reason }),
  })
  if (!res.ok && res.status !== 204) {
    const text = await res.text()
    throw new Error(`PayPal cancelSubscription failed (${res.status}): ${text}`)
  }
}

export async function verifyWebhookSignature(
  headers: Record<string, string>,
  body: string,
  webhookId: string,
): Promise<boolean> {
  const token = await getAccessToken()
  const res = await fetch(`${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      auth_algo: headers["paypal-auth-algo"],
      cert_url: headers["paypal-cert-url"],
      transmission_id: headers["paypal-transmission-id"],
      transmission_sig: headers["paypal-transmission-sig"],
      transmission_time: headers["paypal-transmission-time"],
      webhook_id: webhookId,
      webhook_event: JSON.parse(body),
    }),
  })

  if (!res.ok) return false
  const json = await res.json()
  return json.verification_status === "SUCCESS"
}

export function getPayPalBase(): string {
  return PAYPAL_BASE
}

export function getClientId(): string {
  return process.env.PAYPAL_CLIENT_ID ?? ""
}

export function getPlanId(): string {
  return process.env.PAYPAL_PLAN_ID ?? ""
}

export function isSandbox(): boolean {
  return process.env.PAYPAL_MODE !== "live"
}
