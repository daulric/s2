import type { StockArticle, PriceCandle, ListedStock } from "./types"

const ALPHAVANTAGE_BASE = "https://www.alphavantage.co/query"
const FINNHUB_BASE = "https://finnhub.io/api/v1"

type AlphaVantageSentimentItem = {
  title: string
  url: string
  summary: string
  banner_image?: string
  source: string
  time_published: string
  overall_sentiment_score: number
  overall_sentiment_label: string
  ticker_sentiment?: {
    ticker: string
    relevance_score: string
    ticker_sentiment_score: string
    ticker_sentiment_label: string
  }[]
}

type FinnhubQuoteResponse = {
  c: number   // current price
  d: number   // change
  dp: number  // percent change
  h: number   // high
  l: number   // low
  o: number   // open
  pc: number  // previous close
  t: number   // timestamp
}

type FinnhubCompanyProfile = {
  ticker: string
  name: string
  finnhubIndustry: string
  marketCapitalization: number
}

export async function fetchAlphaVantageNewsSentiment(
  tickers: string[],
  apiKey: string,
): Promise<{
  articles: Omit<StockArticle, "id" | "created_at">[]
  sentiments: { headline: string; ticker: string; score: number; label: string; confidence: number }[]
}> {
  const tickerParam = tickers.join(",")
  const url = `${ALPHAVANTAGE_BASE}?function=NEWS_SENTIMENT&tickers=${tickerParam}&apikey=${apiKey}&limit=50`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Alpha Vantage error: ${res.status}`)
  const data = await res.json()

  if (!data.feed) return { articles: [], sentiments: [] }

  const articles: Omit<StockArticle, "id" | "created_at">[] = []
  const sentiments: { headline: string; ticker: string; score: number; label: string; confidence: number }[] = []

  for (const item of data.feed as AlphaVantageSentimentItem[]) {
    const publishedAt = parseAlphaVantageDate(item.time_published)

    const tickerSentiments = item.ticker_sentiment ?? []
    for (const ts of tickerSentiments) {
      if (!tickers.includes(ts.ticker)) continue

      articles.push({
        ticker: ts.ticker,
        source: item.source,
        headline: item.title,
        summary: item.summary?.slice(0, 500) ?? null,
        url: item.url,
        image_url: item.banner_image ?? null,
        published_at: publishedAt,
      })

      const score = parseFloat(ts.ticker_sentiment_score)
      sentiments.push({
        headline: item.title,
        ticker: ts.ticker,
        score: Math.max(-1, Math.min(1, score)),
        label: score > 0.15 ? "bullish" : score < -0.15 ? "bearish" : "neutral",
        confidence: Math.min(1, parseFloat(ts.relevance_score)),
      })
    }
  }

  return { articles, sentiments }
}

export async function fetchFinnhubQuote(
  ticker: string,
  apiKey: string,
): Promise<{ price: number; changePct: number } | null> {
  const url = `${FINNHUB_BASE}/quote?symbol=${ticker}&token=${apiKey}`
  const res = await fetch(url)
  if (!res.ok) return null
  const data: FinnhubQuoteResponse = await res.json()
  if (!data.c) return null
  return { price: data.c, changePct: data.dp }
}

export async function fetchFinnhubProfile(
  ticker: string,
  apiKey: string,
): Promise<{ name: string; sector: string; marketCap: number } | null> {
  const url = `${FINNHUB_BASE}/stock/profile2?symbol=${ticker}&token=${apiKey}`
  const res = await fetch(url)
  if (!res.ok) return null
  const data: FinnhubCompanyProfile = await res.json()
  if (!data.name) return null
  return {
    name: data.name,
    sector: data.finnhubIndustry,
    marketCap: data.marketCapitalization * 1_000_000,
  }
}

export async function fetchFinnhubCompanyNews(
  ticker: string,
  apiKey: string,
  daysBack = 3,
): Promise<Omit<StockArticle, "id" | "created_at">[]> {
  const to = new Date()
  const from = new Date(to.getTime() - daysBack * 24 * 60 * 60 * 1000)
  const fmt = (d: Date) => d.toISOString().split("T")[0]

  const url = `${FINNHUB_BASE}/company-news?symbol=${ticker}&from=${fmt(from)}&to=${fmt(to)}&token=${apiKey}`
  const res = await fetch(url)
  if (!res.ok) return []
  const data = await res.json()
  if (!Array.isArray(data)) return []

  return data.slice(0, 20).map((item: { source: string; headline: string; summary: string; url: string; image: string; datetime: number }) => ({
    ticker,
    source: item.source,
    headline: item.headline,
    summary: item.summary?.slice(0, 500) ?? null,
    url: item.url,
    image_url: item.image || null,
    published_at: new Date(item.datetime * 1000).toISOString(),
  }))
}

export type CandleRange = "1D" | "1W" | "1M" | "3M" | "1Y" | "5Y" | "10Y" | "ALL"

type AVTimeSeriesEntry = {
  "1. open": string
  "2. high": string
  "3. low": string
  "4. close": string
  "5. volume": string
}

export async function fetchStockCandles(
  ticker: string,
  alphaKey: string,
  range: CandleRange = "1M",
): Promise<PriceCandle[]> {
  let fn: string
  let seriesKey: string
  let params = ""

  if (range === "1D") {
    fn = "TIME_SERIES_INTRADAY"
    seriesKey = "Time Series (5min)"
    params = "&interval=5min&outputsize=full"
  } else if (range === "1W") {
    fn = "TIME_SERIES_INTRADAY"
    seriesKey = "Time Series (60min)"
    params = "&interval=60min&outputsize=full"
  } else if (range === "5Y" || range === "10Y" || range === "ALL") {
    fn = "TIME_SERIES_WEEKLY"
    seriesKey = "Weekly Time Series"
    params = ""
  } else {
    fn = "TIME_SERIES_DAILY"
    seriesKey = "Time Series (Daily)"
    params = range === "1Y" ? "&outputsize=full" : "&outputsize=compact"
  }

  const url = `${ALPHAVANTAGE_BASE}?function=${fn}&symbol=${ticker}&apikey=${alphaKey}${params}`
  const res = await fetch(url)
  if (!res.ok) return []

  const data = await res.json()

  if (data["Note"] || data["Information"]) return []

  const series: Record<string, AVTimeSeriesEntry> | undefined = data[seriesKey]
  if (!series) return []

  const entries = Object.entries(series)
  const daysBack = range === "1D" ? 1
    : range === "1W" ? 7
    : range === "1M" ? 30
    : range === "3M" ? 90
    : range === "1Y" ? 365
    : range === "5Y" ? 1825
    : range === "10Y" ? 3650
    : Infinity
  const cutoff = daysBack === Infinity ? new Date(0) : new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)

  const candles: PriceCandle[] = []
  for (const [dateStr, values] of entries) {
    const date = new Date(dateStr)
    if (date < cutoff) continue

    candles.push({
      date: date.toISOString(),
      open: parseFloat(values["1. open"]),
      high: parseFloat(values["2. high"]),
      low: parseFloat(values["3. low"]),
      close: parseFloat(values["4. close"]),
      volume: parseInt(values["5. volume"], 10),
    })
  }

  return candles.reverse()
}

function parseAlphaVantageDate(raw: string): string {
  // Format: "20241215T120000"
  const y = raw.slice(0, 4)
  const m = raw.slice(4, 6)
  const d = raw.slice(6, 8)
  const h = raw.slice(9, 11)
  const min = raw.slice(11, 13)
  const s = raw.slice(13, 15)
  return `${y}-${m}-${d}T${h}:${min}:${s}Z`
}

const SEC_TICKERS_URL = "https://www.sec.gov/files/company_tickers_exchange.json"
const VALID_EXCHANGES = new Set(["NYSE", "Nasdaq"])
const LISTING_CACHE_TTL_MS = 24 * 60 * 60 * 1000

let listingCache: { data: ListedStock[]; fetchedAt: number } | null = null

export async function fetchActiveListings(): Promise<ListedStock[]> {
  if (listingCache && Date.now() - listingCache.fetchedAt < LISTING_CACHE_TTL_MS) {
    return listingCache.data
  }

  const res = await fetch(SEC_TICKERS_URL, {
    headers: { "User-Agent": "s2-stock-app admin@daulric.dev", "Accept": "application/json" },
  })

  if (!res.ok) {
    throw new Error(`SEC EDGAR returned ${res.status}`)
  }

  const json: {
    fields: string[]
    data: [number, string, string, string][]
  } = await res.json()

  if (!json.data || !Array.isArray(json.data)) {
    throw new Error("Unexpected response format from SEC EDGAR")
  }

  const stocks: ListedStock[] = []

  for (const [, name, ticker, exchange] of json.data) {
    if (!VALID_EXCHANGES.has(exchange) || !ticker || !name) continue
    if (ticker.includes(".") || ticker.includes("-") || ticker.includes("/")) continue

    stocks.push({ ticker, name, exchange })
  }

  listingCache = { data: stocks, fetchedAt: Date.now() }
  return stocks
}

export function computePrediction(sentiments: { score: number; confidence: number }[]): {
  direction: "bullish" | "bearish" | "neutral"
  score: number
  confidence: number
} {
  if (sentiments.length === 0) return { direction: "neutral", score: 0, confidence: 0 }

  let weightedSum = 0
  let totalWeight = 0
  for (const s of sentiments) {
    weightedSum += s.score * s.confidence
    totalWeight += s.confidence
  }

  const avgScore = totalWeight > 0 ? weightedSum / totalWeight : 0
  const avgConfidence = totalWeight / sentiments.length

  const direction: "bullish" | "bearish" | "neutral" =
    avgScore > 0.1 ? "bullish" : avgScore < -0.1 ? "bearish" : "neutral"

  return {
    direction,
    score: Math.round(avgScore * 1000) / 1000,
    confidence: Math.round(avgConfidence * 1000) / 1000,
  }
}
