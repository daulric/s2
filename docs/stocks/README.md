# Stock System

This document covers the stock market intelligence system — data sources, ingestion pipeline, sentiment analysis, predictions, watchlists, real-time feeds, and market hours.

## Overview

s2 maintains a database of stocks across four exchanges (NYSE, Nasdaq, ECSE, EU) with automated news ingestion, sentiment analysis, and price predictions. Data is refreshed daily via a Vercel cron job and augmented with live Finnhub WebSocket data on the client.

```
┌──────────────┐     ┌────────────┐     ┌──────────────┐
│  SEC EDGAR   │────▶│  /api/     │────▶│   stocks     │
│  (listings)  │     │  stocks/   │     │   table      │
└──────────────┘     │  seed      │     └──────────────┘
                     └────────────┘
                                        ┌──────────────┐
┌──────────────┐     ┌────────────┐     │ stock_       │
│  Finnhub     │────▶│  /api/     │────▶│ articles     │
│  Alpha Vant. │     │  stocks/   │     ├──────────────┤
│  Yahoo       │     │  ingest    │     │ article_     │
└──────────────┘     │  (cron)    │────▶│ sentiments   │
                     └────────────┘     ├──────────────┤
                                        │ stock_       │
                                   ────▶│ predictions  │
                                        └──────────────┘
```

## Data Sources

| Source | Usage | API Key Required |
|--------|-------|------------------|
| **Finnhub** | Real-time quotes, company profiles, company news, OHLCV candles, WebSocket live prices | `FINNHUB_API_KEY` / `NEXT_PUBLIC_FINNHUB_API_KEY` |
| **Alpha Vantage** | News sentiment analysis, historical candles (daily/weekly/intraday) | `ALPHAVANTAGE_API_KEY` |
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

## API Routes

### `GET /api/stocks/seed`

Seeds the `stocks` table from SEC EDGAR listings + ECSE/EU listings. Fetches initial quotes for each ticker.

### `GET /api/stocks/ingest` (Cron)

Daily automated ingestion running at `0 6 * * *` (UTC). Protected by `CRON_SECRET`.

For each stock in batches of 5 (with 15s delay between batches):

1. **Price update** — Finnhub quote (US) or Yahoo quote (EU/ECSE)
2. **News fetch** — Alpha Vantage news sentiment API + Finnhub company news
3. **Article persistence** — Deduplicates by headline/URL
4. **Sentiment backfill** — Fills missing sentiment scores for articles
5. **Prediction generation** — Computes weighted-average sentiment → bullish/bearish/neutral prediction

### `GET /api/stocks/ecse-snapshot`

Scrapes the ECSE website for latest prices and updates the `stocks` table.

### `GET /api/stocks/migrate-exchange`

Migration utility for populating the `exchange` column from listing data.

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

## Real-Time Stock Feed

**File:** `hooks/use-stock-feed.ts`

A shared Finnhub WebSocket connection provides live trade updates on the client. The system uses reference counting — the WebSocket connects when the first ticker is subscribed and disconnects when the last one unsubscribes.

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

Exponential backoff with max 30-second delay. Reconnection only happens while at least one ticker is subscribed.

## Server Actions

**File:** `serverActions/GetStockDetails.ts`

| Action | Description |
|--------|-------------|
| `GetAllStocks()` | Returns all stocks with latest prediction, article count, and sentiment average. Cached for 60s. |
| `GetStockDetail(ticker)` | Full stock detail with articles (merged DB + live Finnhub), sentiments, prediction history, and candles. Triggers background article persistence. |
| `GetStockCandles(ticker, range)` | OHLCV candles for a ticker with multi-provider fallback. |
| `GetUserWatchlist()` | Returns the authenticated user's watchlist entries. |
| `ToggleWatchlist(ticker)` | Adds or removes a ticker from the user's watchlist. Returns `{ added: boolean }`. |
| `GetTopMovers(limit?)` | Returns stocks with the highest absolute prediction scores. |

## Market Hours Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useUSEquitiesMarketOpen` | `hooks/use-us-equities-market-open.ts` | Polls US market phase (pre-market, open, after-hours, closed) |
| `useEuMarketOpen` | `hooks/use-eu-market-open.ts` | EU market hours status |
| `useEcseMarketOpen` | `hooks/use-ecse-market-open.ts` | ECSE market hours status |

Market hour logic lives in `lib/stocks/us-market-hours.ts`, `lib/stocks/eu-market-hours.ts`, and `lib/stocks/ecse-market-hours.ts`.

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

All types are defined in `lib/stocks/types.ts`.

## Related Files

| File | Purpose |
|------|---------|
| `lib/stocks/api.ts` | All external API calls (Finnhub, Alpha Vantage, Yahoo, Stooq, SEC) |
| `lib/stocks/types.ts` | TypeScript type definitions |
| `lib/stocks/ecse-scraper.ts` | ECSE website scraper |
| `lib/stocks/eu-listings.ts` | EU stock listing fetcher |
| `lib/stocks/persist-stock-articles.ts` | Deduplicated article insertion |
| `lib/stocks/backfill-article-sentiments.ts` | Fills missing sentiment scores |
| `lib/stocks/article-sentiment-plurality.ts` | Majority sentiment direction |
| `lib/stocks/format-stock-price.ts` | Price formatting utilities |
| `lib/stocks/coerce-stock-number.ts` | Type coercion for DB rows |
| `lib/stocks/sparkline-candle-queue.ts` | Sparkline candle management |
| `lib/stocks/*-market-hours.ts` | Market open/close schedule logic |
| `hooks/use-stock-feed.ts` | Finnhub WebSocket hook |
| `serverActions/GetStockDetails.ts` | Server actions for stock data |
| `app/api/stocks/ingest/route.ts` | Daily cron ingestion |
| `app/api/stocks/seed/route.ts` | Initial stock seeding |
