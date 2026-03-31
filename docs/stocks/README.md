# Stock System

This document covers the stock market intelligence system — data sources, ingestion pipeline, sentiment analysis, predictions, watchlists, real-time feeds, and market hours.

## Overview

s2 maintains a database of stocks across four exchanges (NYSE, Nasdaq, ECSE, EU) with automated news ingestion, sentiment analysis, and price predictions. Data is refreshed daily via a Vercel cron job that proxies to the NestJS backend. Real-time prices are streamed through the backend's WebSocket gateway.

```
┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│  SEC EDGAR   │────▶│  Backend    │────▶│   stocks     │
│  ECSE / EU   │     │  /stocks/   │     │   table      │
│  (listings)  │     │  seed       │     └──────────────┘
└──────────────┘     └─────────────┘
                                          ┌──────────────┐
┌──────────────┐     ┌─────────────┐     │ stock_       │
│  Finnhub     │────▶│  Backend    │────▶│ articles     │
│  Alpha Vant. │     │  /stocks/   │     ├──────────────┤
│  Yahoo       │     │  ingest     │     │ article_     │
└──────────────┘     │  (cron)     │────▶│ sentiments   │
                     └─────────────┘     ├──────────────┤
                                         │ stock_       │
                                    ────▶│ predictions  │
                                         └──────────────┘

┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│  Finnhub WS  │────▶│  Backend    │────▶│  Frontend    │
│  (trades)    │     │  Gateway    │     │  Clients     │
└──────────────┘     │  /ws/stocks │     │  (via WS)    │
                     └─────────────┘     └──────────────┘
```

## Data Sources

| Source | Usage | API Key Required |
|--------|-------|------------------|
| **Finnhub** | Real-time quotes, company profiles, company news, OHLCV candles, WebSocket live prices | `FINNHUB_API_KEY` (backend) |
| **Alpha Vantage** | News sentiment analysis, historical candles (daily/weekly/intraday) | `ALPHAVANTAGE_API_KEY` (backend) |
| **Yahoo Finance** | Fallback quotes and candles (no key needed) | No |
| **Stooq** | Last-resort daily candles for US stocks (CSV) | No |
| **SEC EDGAR** | Active stock listings for NYSE/Nasdaq | No |
| **Wikipedia** | EU stock listings (Euronext) | No |
| **ECSE Website** | Eastern Caribbean Securities Exchange prices (scraped) | No |

## Exchanges Supported

| Exchange | Ticker Format | Data Source |
|----------|--------------|-------------|
| NYSE | `AAPL`, `MSFT` | Finnhub + Alpha Vantage |
| Nasdaq | `GOOG`, `AMZN` | Finnhub + Alpha Vantage |
| ECSE | `BON`, `SKNB` | ECSE scraper |
| EU | `ADS.DE`, `MC.PA` | Yahoo Finance |

## Backend Endpoints

### `GET /stocks/seed`

Seeds the `stocks` table from SEC EDGAR listings + ECSE/EU listings. Fetches initial quotes for each ticker.

### `GET /stocks/ingest` (Cron)

Daily automated ingestion. The frontend's Vercel cron job (`0 6 * * *` UTC) proxies to this endpoint via `GET /api/stocks/ingest`. Protected by `CRON_SECRET`.

For each stock in batches of 5 (with 15s delay between batches):

1. **Price update** — Finnhub quote (US) or Yahoo quote (EU/ECSE)
2. **News fetch** — Alpha Vantage news sentiment API + Finnhub company news
3. **Article persistence** — Deduplicates by headline/URL
4. **Sentiment backfill** — Fills missing sentiment scores for articles
5. **Prediction generation** — Computes weighted-average sentiment → bullish/bearish/neutral prediction

### `POST /stocks/update`

Fetches fresh prices for all stocks, persists them to the database, and broadcasts `price_update` events to all connected WebSocket clients. Requires s2+ or admin access.

### `GET /stocks/ecse-snapshot`

Scrapes the ECSE website for latest prices and updates the `stocks` table.

### `GET /stocks/migrate-exchange`

Migration utility for populating the `exchange` column from listing data.

## WebSocket Gateway (`/ws/stocks`)

The backend maintains a single Finnhub WebSocket connection and relays trade data to authorized clients.

**Connection flow:**
1. Client connects with `?token=<supabase_access_token>`
2. Gateway validates token via Supabase and checks subscription/role via `AccessControlService`
3. Unauthorized connections are closed with `4001` (bad token) or `4003` (no subscription)
4. Client sends `subscribe`/`unsubscribe` messages for individual tickers
5. Backend forwards matching trades as `trade` events and batch price updates as `price_update` events

Connection management ensures only one Finnhub WebSocket is open at a time, with flags to prevent duplicate connections during reconnects.

## Candle Data (OHLCV)

Candles are fetched with a multi-provider fallback strategy:

```
Finnhub → Alpha Vantage → Yahoo Finance → Stooq
```

The first provider to return data wins. Results are cached in-memory with TTLs:

| Range | Resolution | Cache TTL |
|-------|-----------|-----------|
| 1D | 5min | 1 minute |
| 1W | 1hr | 5 minutes |
| 1M | Daily | 10 minutes |
| 3M | Daily | 15 minutes |
| 1Y | Daily | 30 minutes |
| 5Y | Weekly | 1 hour |
| 10Y | Weekly | 1 hour |
| ALL | Weekly/Monthly | 1 hour |

ECSE candles are handled separately by scraping the ECSE website directly.

## Sentiment Analysis

Articles are analyzed for sentiment with scores from `-1` (bearish) to `+1` (bullish):

- **Score > 0.15** → `bullish`
- **Score < -0.15** → `bearish`
- **Otherwise** → `neutral`

Each sentiment also has a `confidence` score (0 to 1) based on the relevance score from Alpha Vantage.

## Predictions

Predictions aggregate recent article sentiments using a **confidence-weighted average**:

```typescript
weightedSum = Σ (score × confidence)
totalWeight = Σ confidence
avgScore = weightedSum / totalWeight
```

Direction thresholds:
- **Score > 0.1** → `bullish`
- **Score < -0.1** → `bearish`
- **Otherwise** → `neutral`

## Real-Time Stock Feed (Frontend)

**File:** `frontend/hooks/use-stock-feed.ts`

Connects to the backend's `/ws/stocks` WebSocket gateway using the user's Supabase access token. The system uses reference counting — the connection opens when the first ticker is subscribed and closes when the last one unsubscribes.

### `useStockFeed(ticker, onUpdate?)`

Subscribe to real-time price updates for a single ticker.

```tsx
import { useStockFeed } from "@/hooks/use-stock-feed"

function StockPrice({ ticker }: { ticker: string }) {
  const latestTrade = useStockFeed(ticker)
  return <span>{latestTrade.value?.price ?? "—"}</span>
}
```

### `useStockFeedMulti(tickers, onUpdate?)`

Subscribe to multiple tickers at once. Returns a function to get the signal for any ticker.

### `shutdownAllStockFeeds()`

Closes the WebSocket, clears all subscriptions, and stops reconnection. Called by `StocksRouteTeardown` when navigating away from `/stocks/*`.

### Reconnection

Exponential backoff with max 30-second delay. Reconnection only happens while at least one ticker is subscribed. Auth rejections (4001/4003) prevent reconnect loops.

## Server Actions (Frontend)

**File:** `frontend/serverActions/GetStockDetails.ts`

| Action | Description |
|--------|-------------|
| `GetAllStocks()` | Returns all stocks with latest prediction, article count, and sentiment average. Cached for 60s. |
| `GetStockDetail(ticker)` | Full stock detail with articles (merged DB + live Finnhub), sentiments, prediction history, and candles. |
| `GetStockCandles(ticker, range)` | OHLCV candles for a ticker with multi-provider fallback. |
| `GetUserWatchlist()` | Returns the authenticated user's watchlist entries. |
| `ToggleWatchlist(ticker)` | Adds or removes a ticker from the user's watchlist. Returns `{ added: boolean }`. |
| `GetTopMovers(limit?)` | Returns stocks with the highest absolute prediction scores. |

## Market Hours Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useUSEquitiesMarketOpen` | `frontend/hooks/use-us-equities-market-open.ts` | Polls US market phase (pre-market, open, after-hours, closed) |
| `useEuMarketOpen` | `frontend/hooks/use-eu-market-open.ts` | EU market hours status |
| `useEcseMarketOpen` | `frontend/hooks/use-ecse-market-open.ts` | ECSE market hours status |

Market hour logic lives in `frontend/lib/stocks/us-market-hours.ts`, `frontend/lib/stocks/eu-market-hours.ts`, and `frontend/lib/stocks/ecse-market-hours.ts`.

## Key Types

```typescript
type StockWithPrediction = Stock & {
  prediction: StockPrediction | null
  article_count: number
  sentiment_avg: number | null
  article_majority_direction: "bullish" | "bearish" | "neutral" | null
}

type StockDetail = Stock & {
  prediction: StockPrediction | null
  articles: (StockArticle & { sentiment: ArticleSentiment | null })[]
  prediction_history: StockPrediction[]
  candles: PriceCandle[]
}

type PriceCandle = {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}
```

All types are defined in `frontend/lib/stocks/types.ts`.

## Related Files

### Backend

| File | Purpose |
|------|---------|
| `backend/src/stocks/stocks.service.ts` | Seed, ingest, update, ecse-snapshot logic |
| `backend/src/stocks/stocks.controller.ts` | REST endpoints |
| `backend/src/stocks/stocks.gateway.ts` | WebSocket gateway (Finnhub relay) |
| `backend/src/stocks/lib/api.ts` | External API calls (Finnhub, Alpha Vantage, Yahoo, SEC) |
| `backend/src/stocks/lib/types.ts` | TypeScript types for stock lib |
| `backend/src/stocks/lib/ecse-scraper.ts` | ECSE website scraper |
| `backend/src/stocks/lib/eu-listings.ts` | EU stock listing fetcher |
| `backend/src/stocks/lib/persist-stock-articles.ts` | Deduplicated article insertion |
| `backend/src/stocks/lib/backfill-article-sentiments.ts` | Fills missing sentiment scores |
| `backend/src/auth/access-control.service.ts` | Subscription/role checks for WS auth |

### Frontend

| File | Purpose |
|------|---------|
| `frontend/lib/stocks/types.ts` | TypeScript type definitions |
| `frontend/lib/stocks/format-stock-price.ts` | Price formatting utilities |
| `frontend/lib/stocks/coerce-stock-number.ts` | Type coercion for DB rows |
| `frontend/lib/stocks/sparkline-candle-queue.ts` | Sparkline candle management |
| `frontend/lib/stocks/*-market-hours.ts` | Market open/close schedule logic |
| `frontend/hooks/use-stock-feed.ts` | Backend WebSocket hook |
| `frontend/serverActions/GetStockDetails.ts` | Server actions for stock data |
| `frontend/app/api/stocks/ingest/route.ts` | Vercel cron proxy to backend |
