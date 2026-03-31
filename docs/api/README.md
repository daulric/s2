# API Reference

This document covers all API endpoints — backend REST routes (NestJS) and frontend Server Actions.

All backend endpoints are served from the NestJS backend (`NEXT_PUBLIC_BACKEND_URL`). The frontend communicates with them via `backendFetch()` which attaches the Supabase access token as a Bearer header.

---

## PayPal Endpoints (Backend)

All PayPal endpoints live on the backend under `/paypal/`.

### `POST /paypal/create-subscription`

Creates a new PayPal billing subscription and returns an approval URL.

**Auth:** Requires `SupabaseAuthGuard`.

**Response (200):**

```json
{
  "subscriptionId": "I-XXXXXXXXX",
  "approveUrl": "https://www.paypal.com/webapps/billing/subscriptions?ba_token=..."
}
```

**Errors:**

| Status | Reason |
|--------|--------|
| 401 | No authenticated user |
| 500 | PayPal API error |

---

### `POST /paypal/subscribe`

Activates a subscription after PayPal approval. Verifies the subscription status with PayPal and upserts the `subscriptions` table.

**Auth:** Requires `SupabaseAuthGuard`.

**Request body:**

```json
{
  "subscriptionId": "I-XXXXXXXXX"
}
```

**Response (200):**

```json
{
  "status": "ACTIVE",
  "subscriptionId": "I-XXXXXXXXX"
}
```

**Errors:**

| Status | Reason |
|--------|--------|
| 401 | No authenticated user |
| 400 | Missing `subscriptionId` |
| 400 | Subscription not active at PayPal |
| 500 | Database or PayPal API error |

---

### `GET /paypal/status`

Returns the current user's subscription status. Works for both authenticated and unauthenticated users.

**Response (200) — subscribed:**

```json
{
  "subscribed": true,
  "status": "ACTIVE",
  "planId": "P-62G...",
  "currentPeriodEnd": "2026-04-30T00:00:00Z",
  "paypalSubscriptionId": "I-XXXXXXXXX"
}
```

**Response (200) — not subscribed:**

```json
{
  "subscribed": false,
  "status": null
}
```

---

### `POST /paypal/cancel`

Cancels the current user's active subscription via PayPal API and sets the database status to `CANCELLED`.

**Auth:** Requires `SupabaseAuthGuard`.

**Response (200):**

```json
{
  "status": "CANCELLED"
}
```

**Errors:**

| Status | Reason |
|--------|--------|
| 401 | No authenticated user |
| 404 | No active subscription found |
| 500 | PayPal API error |

---

### `POST /paypal/webhook`

Receives PayPal webhook events. Not called by client code.

**Signature verification:** When `PAYPAL_WEBHOOK_ID` is set, verifies PayPal's webhook signature. Skipped in development when the ID is empty.

**Handled events:**

| Event | Action |
|-------|--------|
| `BILLING.SUBSCRIPTION.ACTIVATED` | Status → `ACTIVE`, updates `current_period_end` |
| `BILLING.SUBSCRIPTION.SUSPENDED` | Status → `SUSPENDED` |
| `BILLING.SUBSCRIPTION.CANCELLED` | Status → `CANCELLED` |
| `BILLING.SUBSCRIPTION.EXPIRED` | Status → `EXPIRED` |
| `BILLING.SUBSCRIPTION.PAYMENT.FAILED` | Status → `SUSPENDED` |
| `PAYMENT.SALE.COMPLETED` | Confirms status → `ACTIVE` |

**Response (200):**

```json
{
  "received": true
}
```

---

## Stock Endpoints (Backend)

All stock endpoints live on the backend under `/stocks/`.

### `GET /stocks/ingest` (Cron)

Daily automated stock data ingestion. The frontend's Vercel cron job (`0 6 * * *` UTC) proxies to this endpoint.

**Auth:** Protected by `CRON_SECRET` via `Authorization: Bearer <secret>` header.

**Process (per batch of 5 tickers with 15s delay):**

1. Fetches latest price quote (Finnhub for US, Yahoo for EU/ECSE)
2. Fetches news articles (Alpha Vantage sentiment + Finnhub company news)
3. Deduplicates and persists articles
4. Backfills missing article sentiments
5. Computes and inserts sentiment predictions

**Response (200):**

```json
{
  "message": "Ingested 150/150 stocks",
  "results": [
    { "ticker": "AAPL", "status": "ok" },
    { "ticker": "GOOG", "status": "ok" }
  ],
  "timestamp": "2026-03-30T06:00:00.000Z"
}
```

**Errors:**

| Status | Reason |
|--------|--------|
| 401 | Invalid or missing `CRON_SECRET` |
| 500 | Missing API keys or no stocks in database |

---

### `POST /stocks/update`

Fetches fresh prices for all stocks, persists them, and broadcasts updates to connected WebSocket clients.

**Auth:** Requires `SupabaseAuthGuard` + `SubscriptionGuard` (s2+ or admin).

**Response (200):**

```json
{
  "updated": 150
}
```

---

### `GET /stocks/seed`

Seeds the `stocks` table from SEC EDGAR active listings plus ECSE and EU listings. Run once to populate the initial stock universe.

**Response:** Summary of seeded stocks.

---

### `GET /stocks/ecse-snapshot`

Scrapes the Eastern Caribbean Securities Exchange website for latest prices and updates the `stocks` table for ECSE tickers.

**Response:** Summary of updated ECSE stocks.

---

### `GET /stocks/migrate-exchange`

Migration utility that populates the `exchange` column on the `stocks` table using listing data from SEC EDGAR, ECSE, and EU sources.

**Response:** Summary of migrated rows.

---

## WebSocket Gateway (Backend)

### `/ws/stocks`

Real-time stock price feed via WebSocket (Socket.IO transport).

**Connection:** `ws(s)://<backend>/ws/stocks?token=<supabase_access_token>`

**Auth:** On connect, the gateway validates the Supabase token and checks s2+ subscription or admin role via `AccessControlService`. Unauthorized connections are closed with code `4001` (invalid token) or `4003` (subscription required).

**Client → Server messages:**

| Type | Payload | Description |
|------|---------|-------------|
| `subscribe` | `{ "symbol": "AAPL" }` | Subscribe to live trades for a ticker |
| `unsubscribe` | `{ "symbol": "AAPL" }` | Unsubscribe from a ticker |

**Server → Client messages:**

| Type | Payload | Description |
|------|---------|-------------|
| `trade` | `{ "s": "AAPL", "p": 185.50, "t": 1711900800000, "v": 100 }` | Live trade from Finnhub |
| `price_update` | `{ "ticker": "AAPL", "price": 185.50 }` | Broadcast after `POST /stocks/update` |

The backend maintains a single Finnhub WebSocket connection and fans out trade data to all connected clients.

---

## Vercel Cron Proxy (Frontend)

### `GET /api/stocks/ingest`

A thin proxy in the frontend that forwards Vercel's cron `Authorization` header to the backend's `/stocks/ingest` endpoint. Configured in `vercel.json`.

---

## Server Actions (Frontend)

Server Actions are called directly from client components, not via HTTP.

### Stock Actions (`frontend/serverActions/GetStockDetails.ts`)

| Action | Returns |
|--------|---------|
| `GetAllStocks()` | All stocks with predictions and sentiment (cached 60s) |
| `GetStockDetail(ticker)` | Full stock detail with articles, sentiments, predictions, candles |
| `GetStockCandles(ticker, range)` | OHLCV candles with multi-provider fallback |
| `GetUserWatchlist()` | Current user's watchlist entries |
| `ToggleWatchlist(ticker)` | Add/remove from watchlist, returns `{ added: boolean }` |
| `GetTopMovers(limit?)` | Stocks with highest absolute prediction scores |
| `GetWatchlistStocks()` | Stocks matching user's watchlist tickers with predictions |

### Video Actions (`frontend/serverActions/GetVideoDetails.ts`)

| Action | Returns |
|--------|---------|
| `GetVideoDetails(id)` | Single video with signed URLs and creator data |
| `GetPublicVideos(time_allowed?, limit?)` | Public videos, newest first |
| `GetUserVideos(userId, limit?)` | User's own public videos |
| `GetSubscriptionVideos(userId, limit?)` | Videos from subscribed creators |
| `GetVideoSidebarVideos(excludeId)` | Trending + newest videos for sidebar |

### Shorts Actions (`frontend/serverActions/GetShortsData.ts`)

| Action | Returns |
|--------|---------|
| `GetShortsData()` | All shorts with likes, subscription status, creator data |

### Audio Actions (`frontend/serverActions/GetAudioDetails.ts`)

| Action | Returns |
|--------|---------|
| `GetAudioDetails(id)` | Single audio track with signed URLs |
| `GetPublicAudios(time_allowed?, limit?)` | Public audio tracks, newest first |
| `updateAudioDetails(id, payload)` | Update audio metadata (owner only) |
