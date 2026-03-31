# API Reference

This document covers all API routes in the application — PayPal subscription endpoints and stock data endpoints.

## PayPal Subscription Endpoints

All PayPal endpoints live under `/api/paypal/`. See [Pricing Documentation](../pricing/README.md) for the full subscription flow.

### `POST /api/paypal/create-subscription`

Creates a new PayPal billing subscription and returns an approval URL.

**Auth:** Requires authenticated user session.

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

### `POST /api/paypal/subscribe`

Activates a subscription after PayPal approval. Verifies the subscription status with PayPal and upserts the `subscriptions` table.

**Auth:** Requires authenticated user session.

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

### `GET /api/paypal/status`

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

### `POST /api/paypal/cancel`

Cancels the current user's active subscription via PayPal API and sets the database status to `CANCELLED`.

**Auth:** Requires authenticated user session.

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

### `POST /api/paypal/webhook`

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

## Stock Data Endpoints

All stock endpoints live under `/api/stocks/`. These are operational/cron endpoints, not intended for direct client use.

### `GET /api/stocks/ingest`

Daily automated stock data ingestion. Configured as a Vercel cron job (`0 6 * * *` UTC).

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

### `GET /api/stocks/seed`

Seeds the `stocks` table from SEC EDGAR active listings plus ECSE and EU listings. Run once to populate the initial stock universe.

**Response:** Summary of seeded stocks.

---

### `GET /api/stocks/ecse-snapshot`

Scrapes the Eastern Caribbean Securities Exchange website for latest prices and updates the `stocks` table for ECSE tickers.

**Response:** Summary of updated ECSE stocks.

---

### `GET /api/stocks/migrate-exchange`

Migration utility that populates the `exchange` column on the `stocks` table using listing data from SEC EDGAR, ECSE, and EU sources.

**Response:** Summary of migrated rows.

---

## Server Actions

In addition to API routes, s2 uses Next.js Server Actions for data fetching. These are called directly from client components, not via HTTP.

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
