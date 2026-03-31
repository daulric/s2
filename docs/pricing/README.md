# s2+ Subscription System

This document covers the complete s2+ subscription implementation — architecture, setup, API reference, webhook handling, and going live.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Environment Variables](#environment-variables)
- [Database Schema](#database-schema)
- [Setup Guide](#setup-guide)
- [API Reference](#api-reference)
- [Webhook Integration](#webhook-integration)
- [Client Integration](#client-integration)
- [Going to Production](#going-to-production)
- [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌─────────────────┐     ┌───────────────────┐     ┌─────────────┐
│   Pricing Page   │────▶│  PayPal JS SDK     │────▶│  PayPal API │
│  (page_client)   │     │  (Subscription     │     │  (Sandbox/  │
│                  │     │   Buttons)         │     │   Live)     │
└────────┬─────────┘     └───────────────────┘     └──────┬──────┘
         │                                                 │
         │ POST /api/paypal/subscribe                      │ Webhook POST
         ▼                                                 ▼
┌─────────────────┐                              ┌─────────────────┐
│  Subscribe API   │                              │  Webhook API     │
│  (verify + save) │                              │  (verify + sync) │
└────────┬─────────┘                              └────────┬─────────┘
         │                                                 │
         ▼                                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Supabase (subscriptions table)               │
└──────────────────────────────────────────────────────────────────┘
         ▲
         │  GET /api/paypal/status
         │  POST /api/paypal/cancel
┌────────┴─────────┐
│  useSubscription  │  (React hook)
│  hook             │
└──────────────────┘
```

### Flow Summary

1. User visits `/pricing` and clicks the PayPal subscribe button
2. PayPal JS SDK opens a popup for the user to approve the subscription
3. On approval, the client calls `POST /api/paypal/subscribe` with the subscription ID
4. The server verifies the subscription with PayPal and writes it to Supabase
5. PayPal sends webhook events for ongoing lifecycle changes (renewal, cancellation, failure)
6. The `useSubscription` hook fetches status from `GET /api/paypal/status` for client-side feature gating

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PAYPAL_CLIENT_ID` | PayPal app client ID (server-side) | Yes |
| `PAYPAL_SECRET` | PayPal app secret (server-side) | Yes |
| `PAYPAL_MODE` | `sandbox` or `live` | Yes |
| `PAYPAL_PLAN_ID` | PayPal billing plan ID | Yes |
| `PAYPAL_WEBHOOK_ID` | PayPal webhook ID for signature verification | Yes (production) |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | Same as `PAYPAL_CLIENT_ID`, exposed to browser | Yes |
| `NEXT_PUBLIC_PAYPAL_PLAN_ID` | Same as `PAYPAL_PLAN_ID`, exposed to browser | Yes |

**.env example:**

```env
PAYPAL_CLIENT_ID=AVAx...lzVC
PAYPAL_SECRET=EE7S...t6fI
PAYPAL_MODE=sandbox
PAYPAL_PLAN_ID=P-62G...QWJI
PAYPAL_WEBHOOK_ID=
NEXT_PUBLIC_PAYPAL_CLIENT_ID=AVAx...lzVC
NEXT_PUBLIC_PAYPAL_PLAN_ID=P-62G...QWJI
```

> `PAYPAL_WEBHOOK_ID` can be empty during local development. Webhook signature verification is skipped when the ID is not set.

---

## Database Schema

The `subscriptions` table lives in the same schema as the rest of the app (`meetup-app`).

```sql
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  paypal_subscription_id text not null unique,
  plan_id text not null,
  status text not null default 'PENDING'
    check (status in ('PENDING','ACTIVE','SUSPENDED','CANCELLED','EXPIRED')),
  current_period_end timestamptz,
  paypal_email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

**Key constraints:**
- `user_id` is `unique` — one subscription per user
- `paypal_subscription_id` is `unique` — prevents duplicates
- `status` is constrained to a known set of lifecycle states

**RLS policies:**
- Users can **read** their own subscription (`auth.uid() = user_id`)
- Service role can **insert** and **update** any row (used by API routes and webhooks)

Run the full schema in `sql/schema.sql` via the Supabase SQL Editor.

---

## Setup Guide

### 1. Create a PayPal App

1. Go to https://developer.paypal.com/dashboard/applications/sandbox (sandbox) or https://developer.paypal.com/dashboard/applications/live (production)
2. Click **Create App**
3. Copy the **Client ID** and **Secret**

### 2. Create a Product and Plan

Using the PayPal REST API:

```bash
# Get access token
TOKEN=$(curl -s -X POST "https://api-m.sandbox.paypal.com/v1/oauth2/token" \
  -H "Accept: application/json" \
  -u "$PAYPAL_CLIENT_ID:$PAYPAL_SECRET" \
  -d "grant_type=client_credentials" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Create product
PRODUCT_ID=$(curl -s -X POST "https://api-m.sandbox.paypal.com/v1/catalogs/products" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "s2+",
    "description": "s2+ monthly subscription",
    "type": "SERVICE",
    "category": "SOFTWARE"
  }' | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

# Create billing plan
PLAN_ID=$(curl -s -X POST "https://api-m.sandbox.paypal.com/v1/billing/plans" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"product_id\": \"$PRODUCT_ID\",
    \"name\": \"s2+ Monthly\",
    \"billing_cycles\": [{
      \"frequency\": {\"interval_unit\": \"MONTH\", \"interval_count\": 1},
      \"tenure_type\": \"REGULAR\",
      \"sequence\": 1,
      \"total_cycles\": 0,
      \"pricing_scheme\": {\"fixed_price\": {\"value\": \"5\", \"currency_code\": \"USD\"}}
    }],
    \"payment_preferences\": {
      \"auto_bill_outstanding\": true,
      \"payment_failure_threshold\": 3
    }
  }" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

echo "Plan ID: $PLAN_ID"
```

### 3. Create a Webhook

1. Go to **PayPal Dashboard → Webhooks**
2. Click **Add Webhook**
3. Set the URL to `https://your-domain.com/api/paypal/webhook`
4. Subscribe to these events:
   - `BILLING.SUBSCRIPTION.ACTIVATED`
   - `BILLING.SUBSCRIPTION.SUSPENDED`
   - `BILLING.SUBSCRIPTION.CANCELLED`
   - `BILLING.SUBSCRIPTION.EXPIRED`
   - `BILLING.SUBSCRIPTION.PAYMENT.FAILED`
   - `PAYMENT.SALE.COMPLETED`
5. Copy the **Webhook ID** and set it as `PAYPAL_WEBHOOK_ID`

### 4. Run the Database Migration

Open the Supabase SQL Editor and run the contents of `sql/schema.sql`.

### 5. For Local Development

Use [ngrok](https://ngrok.com/) to expose your local server for webhook testing:

```bash
ngrok http 3000
```

Then update the webhook URL in the PayPal dashboard to your ngrok URL.

---

## API Reference

### `POST /api/paypal/subscribe`

Activates a subscription after PayPal approval.

**Auth:** Requires authenticated user session.

**Request body:**

```json
{
  "subscriptionId": "I-XXXXXXXXX"
}
```

**Success response (200):**

```json
{
  "status": "ACTIVE",
  "subscriptionId": "I-XXXXXXXXX"
}
```

**Error responses:**

| Status | Body | Reason |
|--------|------|--------|
| 401 | `{ "error": "Unauthorized" }` | No authenticated user |
| 400 | `{ "error": "Missing subscriptionId" }` | Invalid request body |
| 400 | `{ "error": "Subscription not active (status: ...)" }` | PayPal subscription not approved |
| 500 | `{ "error": "..." }` | Database or PayPal API error |

---

### `GET /api/paypal/status`

Returns the current user's subscription status.

**Auth:** Works for both authenticated and unauthenticated users (returns `subscribed: false` for unauthenticated).

**Success response (200):**

```json
{
  "subscribed": true,
  "status": "ACTIVE",
  "planId": "P-62G...",
  "currentPeriodEnd": "2026-04-30T00:00:00Z",
  "paypalSubscriptionId": "I-XXXXXXXXX"
}
```

If not subscribed:

```json
{
  "subscribed": false,
  "status": null
}
```

---

### `POST /api/paypal/cancel`

Cancels the current user's active subscription.

**Auth:** Requires authenticated user session.

**Success response (200):**

```json
{
  "status": "CANCELLED"
}
```

**Error responses:**

| Status | Body | Reason |
|--------|------|--------|
| 401 | `{ "error": "Unauthorized" }` | No authenticated user |
| 404 | `{ "error": "No active subscription found" }` | User has no active subscription |
| 500 | `{ "error": "..." }` | PayPal API error |

---

### `POST /api/paypal/webhook`

Receives and processes PayPal webhook events. Not called directly by the client.

**Handled events:**

| Event | Action |
|-------|--------|
| `BILLING.SUBSCRIPTION.ACTIVATED` | Sets status to `ACTIVE`, updates next billing date |
| `BILLING.SUBSCRIPTION.SUSPENDED` | Sets status to `SUSPENDED` |
| `BILLING.SUBSCRIPTION.CANCELLED` | Sets status to `CANCELLED` |
| `BILLING.SUBSCRIPTION.EXPIRED` | Sets status to `EXPIRED` |
| `BILLING.SUBSCRIPTION.PAYMENT.FAILED` | Sets status to `SUSPENDED` |
| `PAYMENT.SALE.COMPLETED` | Confirms status as `ACTIVE` |

---

## Webhook Integration

### Why Webhooks Are Needed

The client-side PayPal flow only handles the initial subscription creation. All subsequent events happen server-to-server:

- Monthly payment renewals
- Failed payments
- User cancelling via PayPal.com
- PayPal suspending the subscription due to payment issues
- Subscription expiration

Without webhooks, your database would become stale after the first payment.

### Signature Verification

When `PAYPAL_WEBHOOK_ID` is set, the webhook handler verifies PayPal's signature using:

- `paypal-auth-algo`
- `paypal-cert-url`
- `paypal-transmission-id`
- `paypal-transmission-sig`
- `paypal-transmission-time`

These headers are sent by PayPal with every webhook delivery. The handler sends them to PayPal's `/v1/notifications/verify-webhook-signature` endpoint for validation.

> In development, you can leave `PAYPAL_WEBHOOK_ID` empty to skip verification.

### Testing Webhooks Locally

1. Install ngrok: `brew install ngrok` (macOS) or download from https://ngrok.com
2. Start your dev server: `bun dev`
3. Expose it: `ngrok http 3000`
4. Copy the ngrok HTTPS URL
5. Update the webhook URL in PayPal Dashboard to: `https://xxxx.ngrok-free.app/api/paypal/webhook`
6. Use the PayPal Sandbox to trigger test events

---

## Client Integration

### `useSubscription` Hook

The `useSubscription` hook (`hooks/use-subscription.ts`) provides subscription state to any client component.

```tsx
import { useSubscription } from "@/hooks/use-subscription"

function MyComponent() {
  const { loading, subscribed, status, currentPeriodEnd, refresh } = useSubscription()

  if (loading) return <Spinner />

  if (subscribed) {
    return <PremiumContent />
  }

  return <FreeContent />
}
```

**Returned values:**

| Field | Type | Description |
|-------|------|-------------|
| `loading` | `boolean` | True while fetching status |
| `subscribed` | `boolean` | True if status is `ACTIVE` |
| `status` | `string \| null` | Raw status: `ACTIVE`, `SUSPENDED`, `CANCELLED`, `EXPIRED`, or `null` |
| `planId` | `string \| null` | PayPal plan ID |
| `currentPeriodEnd` | `string \| null` | ISO date of next billing |
| `paypalSubscriptionId` | `string \| null` | PayPal subscription ID |
| `refresh` | `() => void` | Re-fetch subscription status |

### Feature Gating Example

```tsx
function StockPrice({ ticker }: { ticker: string }) {
  const { subscribed } = useSubscription()
  const isEu = ticker.includes(".")

  if (isEu && !subscribed) {
    return (
      <div>
        <Link href="/pricing">Upgrade to s2+ for live EU prices</Link>
      </div>
    )
  }

  return <LivePrice ticker={ticker} />
}
```

---

## Going to Production

### Checklist

1. **Create a live PayPal app** at https://developer.paypal.com/dashboard/applications/live
2. **Create a live product and plan** using the same curl commands but with `https://api-m.paypal.com` instead of `https://api-m.sandbox.paypal.com`
3. **Create a live webhook** pointing to your production domain
4. **Update environment variables:**

```env
PAYPAL_CLIENT_ID=<live client id>
PAYPAL_SECRET=<live secret>
PAYPAL_MODE=live
PAYPAL_PLAN_ID=<live plan id>
PAYPAL_WEBHOOK_ID=<live webhook id>
NEXT_PUBLIC_PAYPAL_CLIENT_ID=<live client id>
NEXT_PUBLIC_PAYPAL_PLAN_ID=<live plan id>
```

5. **Deploy** and verify:
   - Test a real subscription with a small amount
   - Verify webhook delivery in the PayPal dashboard
   - Confirm the subscription appears in Supabase

### Sandbox vs Production Differences

| Aspect | Sandbox | Production |
|--------|---------|------------|
| API base URL | `api-m.sandbox.paypal.com` | `api-m.paypal.com` |
| PayPal accounts | Test accounts | Real accounts |
| Payments | Simulated | Real charges |
| Webhook verification | Optional | Required |
| Webhook URL | ngrok or test domain | Production domain |

The code automatically switches based on `PAYPAL_MODE`. No code changes are needed.

---

## Troubleshooting

### PayPal buttons not rendering

- Verify `NEXT_PUBLIC_PAYPAL_CLIENT_ID` is set and not empty
- Check browser console for PayPal SDK errors
- Ensure `NEXT_PUBLIC_PAYPAL_PLAN_ID` matches an active plan

### Subscription created but status stuck on PENDING

- Check that `POST /api/paypal/subscribe` was called after approval
- Look for errors in the server logs
- Verify the PayPal subscription status via the dashboard or API

### Webhook events not arriving

- Verify the webhook URL is publicly accessible (use ngrok for local dev)
- Check the PayPal Dashboard → Webhooks → Recent Events for delivery failures
- Ensure `PAYPAL_WEBHOOK_ID` matches the webhook in the dashboard

### "Invalid signature" on webhook

- Double-check `PAYPAL_WEBHOOK_ID` matches exactly
- Ensure you're not behind a proxy that strips headers
- For local dev, set `PAYPAL_WEBHOOK_ID` to empty to skip verification

### Database errors

- Run the migration in `sql/schema.sql` to create the `subscriptions` table
- Check that the service role key is set in your Supabase connection
- Verify RLS policies are in place

---

## File Reference

| File | Purpose |
|------|---------|
| `lib/paypal.ts` | Server-side PayPal helpers (auth, subscription API, webhook verification) |
| `hooks/use-subscription.ts` | Client-side React hook for subscription state |
| `app/api/paypal/subscribe/route.ts` | Activates a subscription after PayPal approval |
| `app/api/paypal/status/route.ts` | Returns current user's subscription status |
| `app/api/paypal/cancel/route.ts` | Cancels an active subscription |
| `app/api/paypal/webhook/route.ts` | Processes PayPal webhook events |
| `app/pricing/page_client.tsx` | Pricing page UI with PayPal buttons |
| `sql/schema.sql` | Database schema including subscriptions table |
