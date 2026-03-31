import type { StockArticle, PriceCandle, ListedStock } from "./types"
import { fetchEuListings, isEuTicker } from "./eu-listings"

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

  const tickerSetUpper = new Set(tickers.map((t) => t.toUpperCase()))

  const articles: Omit<StockArticle, "id" | "created_at">[] = []
  const sentiments: { headline: string; ticker: string; score: number; label: string; confidence: number }[] = []

  for (const item of data.feed as AlphaVantageSentimentItem[]) {
    const publishedAt = parseAlphaVantageDate(item.time_published)

    const tickerSentiments = item.ticker_sentiment ?? []
    for (const ts of tickerSentiments) {
      if (!tickerSetUpper.has(ts.ticker.toUpperCase())) continue

      articles.push({
        ticker: ts.ticker.toUpperCase(),
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
        ticker: ts.ticker.toUpperCase(),
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

export async function fetchYahooQuote(
  ticker: string,
): Promise<{ price: number; changePct: number } | null> {
  const trimmed = ticker.trim().toUpperCase()
  const yahooSymbol = isEuTicker(trimmed) ? trimmed : trimmed.replace(/\./g, "-")
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=5d&interval=1d`

  try {
    const res = await fetch(url, { cache: "no-store", headers: CHART_FETCH_HEADERS })
    if (!res.ok) return null
    const json = await res.json()
    const meta = json?.chart?.result?.[0]?.meta
    if (!meta?.regularMarketPrice) return null

    const price = meta.regularMarketPrice as number
    const prevClose = (meta.chartPreviousClose ?? meta.previousClose) as number | undefined
    const changePct = prevClose && prevClose > 0
      ? ((price - prevClose) / prevClose) * 100
      : 0

    return { price, changePct }
  } catch {
    return null
  }
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
    params = range === "1Y" || range === "3M" ? "&outputsize=full" : "&outputsize=compact"
  }

  const url = `${ALPHAVANTAGE_BASE}?function=${fn}&symbol=${ticker}&apikey=${alphaKey}${params}`
  const res = await fetch(url)
  if (!res.ok) return []

  const data = await res.json()

  if (data["Note"] || data["Information"] || data["Error Message"]) return []

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

  return filterValidCandles(candles.reverse())
}

function filterValidCandles(candles: PriceCandle[]): PriceCandle[] {
  return candles.filter(
    (c) =>
      Number.isFinite(c.open) &&
      Number.isFinite(c.high) &&
      Number.isFinite(c.low) &&
      Number.isFinite(c.close),
  )
}

/** OHLCV when Alpha Vantage is rate-limited or errors. */
export async function fetchFinnhubStockCandles(
  ticker: string,
  token: string,
  range: CandleRange,
): Promise<PriceCandle[]> {
  const sym = ticker.trim().toUpperCase()
  if (!sym) return []

  const now = Math.floor(Date.now() / 1000)
  let fromSec: number
  let resolution: string

  switch (range) {
    case "1D":
      fromSec = now - 86400
      resolution = "5"
      break
    case "1W":
      fromSec = now - 7 * 86400
      resolution = "60"
      break
    case "1M":
      fromSec = now - 30 * 86400
      resolution = "D"
      break
    case "3M":
      fromSec = now - 90 * 86400
      resolution = "D"
      break
    case "1Y":
      fromSec = now - 370 * 86400
      resolution = "D"
      break
    case "5Y":
      fromSec = now - 5 * 370 * 86400
      resolution = "W"
      break
    case "10Y":
      fromSec = now - 10 * 370 * 86400
      resolution = "W"
      break
    case "ALL":
      fromSec = now - 40 * 370 * 86400
      resolution = "W"
      break
    default:
      fromSec = now - 90 * 86400
      resolution = "D"
  }

  const url = `${FINNHUB_BASE}/stock/candle?symbol=${encodeURIComponent(sym)}&resolution=${resolution}&from=${fromSec}&to=${now}&token=${encodeURIComponent(token)}`
  const res = await fetch(url)
  if (!res.ok) return []

  const data: {
    s?: string
    t?: number[]
    o?: number[]
    h?: number[]
    l?: number[]
    c?: number[]
    v?: number[]
  } = await res.json()

  if (data.s !== "ok" || !Array.isArray(data.t) || data.t.length === 0) return []

  const { t, o, h, l, c, v } = data
  const out: PriceCandle[] = []
  for (let i = 0; i < t.length; i++) {
    const close = c?.[i]
    if (typeof close !== "number" || !Number.isFinite(close)) continue
    out.push({
      date: new Date(t[i]! * 1000).toISOString(),
      open: typeof o?.[i] === "number" && Number.isFinite(o[i]!) ? o[i]! : close,
      high: typeof h?.[i] === "number" && Number.isFinite(h[i]!) ? h[i]! : close,
      low: typeof l?.[i] === "number" && Number.isFinite(l[i]!) ? l[i]! : close,
      close,
      volume:
        typeof v?.[i] === "number" && Number.isFinite(v[i]!) ? Math.max(0, Math.round(v[i]!)) : 0,
    })
  }

  return out
}

const CHART_FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "*/*",
} as const

function yahooChartQuery(range: CandleRange): { range: string; interval: string } {
  switch (range) {
    case "1D":
      return { range: "1d", interval: "5m" }
    case "1W":
      return { range: "5d", interval: "1h" }
    case "1M":
      return { range: "1mo", interval: "1d" }
    case "3M":
      return { range: "3mo", interval: "1d" }
    case "1Y":
      return { range: "1y", interval: "1d" }
    case "5Y":
      return { range: "5y", interval: "1wk" }
    case "10Y":
      return { range: "10y", interval: "1wk" }
    case "ALL":
      return { range: "max", interval: "1mo" }
    default:
      return { range: "3mo", interval: "1d" }
  }
}

/** No API key — used when AV + Finnhub return nothing (rate limits, free-tier no_data). */
export async function fetchYahooFinanceCandles(ticker: string, range: CandleRange): Promise<PriceCandle[]> {
  const trimmed = ticker.trim().toUpperCase()
  const yahooSymbol = isEuTicker(trimmed) ? trimmed : trimmed.replace(/\./g, "-")
  const { range: r, interval } = yahooChartQuery(range)
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=${r}&interval=${interval}`

  try {
    const res = await fetch(url, { cache: "no-store", headers: CHART_FETCH_HEADERS })
    if (!res.ok) return []
    const json: {
      chart?: { result?: Array<{
        timestamp: number[]
        indicators?: { quote?: Array<{
          open?: (number | null)[]
          high?: (number | null)[]
          low?: (number | null)[]
          close?: (number | null)[]
          volume?: (number | null)[]
        }> }
      }>; error?: unknown }
    } = await res.json()

    const result = json?.chart?.result?.[0]
    const ts = result?.timestamp
    const q = result?.indicators?.quote?.[0]
    if (!result || !ts?.length || !q) return []

    const out: PriceCandle[] = []
    for (let i = 0; i < ts.length; i++) {
      const close = q.close?.[i]
      if (close == null || !Number.isFinite(close)) continue
      const open = q.open?.[i] ?? close
      const high = q.high?.[i] ?? close
      const low = q.low?.[i] ?? close
      const vol = q.volume?.[i]
      out.push({
        date: new Date(ts[i]! * 1000).toISOString(),
        open: typeof open === "number" && Number.isFinite(open) ? open : close,
        high: typeof high === "number" && Number.isFinite(high) ? high : close,
        low: typeof low === "number" && Number.isFinite(low) ? low : close,
        close,
        volume:
          typeof vol === "number" && Number.isFinite(vol) ? Math.max(0, Math.round(vol)) : 0,
      })
    }
    return filterValidCandles(out)
  } catch {
    return []
  }
}

/** Stooq CSV — last resort, US symbols only (`ticker.us`). */
export async function fetchStooqDailyCandles(ticker: string, range: CandleRange): Promise<PriceCandle[]> {
  if (isEuTicker(ticker)) return []
  const sym = `${ticker.trim().toLowerCase()}.us`
  const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(sym)}&i=d`

  try {
    const res = await fetch(url, { cache: "no-store", headers: CHART_FETCH_HEADERS })
    if (!res.ok) return []
    const text = await res.text()
    const lines = text.trim().split(/\r?\n/).filter(Boolean)
    if (lines.length < 2) return []
    if (!lines[0].toLowerCase().includes("date")) return []

    const daysBack =
      range === "1D"
        ? 2
        : range === "1W"
          ? 10
          : range === "1M"
            ? 35
            : range === "3M"
              ? 100
              : range === "1Y"
                ? 400
                : range === "5Y"
                  ? 2000
                  : range === "10Y"
                    ? 4000
                    : range === "ALL"
                      ? 20000
                      : 100

    const cutoff =
      daysBack >= 20000 ? new Date(0) : new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)

    const candles: PriceCandle[] = []
    for (let li = 1; li < lines.length; li++) {
      const parts = lines[li].split(",")
      if (parts.length < 5) continue
      const date = new Date(parts[0]!)
      if (Number.isNaN(date.getTime()) || date < cutoff) continue
      const open = parseFloat(parts[1]!)
      const high = parseFloat(parts[2]!)
      const low = parseFloat(parts[3]!)
      const close = parseFloat(parts[4]!)
      const volRaw = parts[5] ? parseFloat(parts[5]) : 0
      candles.push({
        date: date.toISOString(),
        open,
        high,
        low,
        close,
        volume: Number.isFinite(volRaw) ? Math.max(0, Math.round(volRaw)) : 0,
      })
    }

    candles.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    return filterValidCandles(candles)
  } catch {
    return []
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ])
}

const candleCache = new Map<string, { data: PriceCandle[]; ts: number }>()
const CANDLE_CACHE_TTL: Record<CandleRange, number> = {
  "1D": 60_000,
  "1W": 5 * 60_000,
  "1M": 10 * 60_000,
  "3M": 15 * 60_000,
  "1Y": 30 * 60_000,
  "5Y": 60 * 60_000,
  "10Y": 60 * 60_000,
  "ALL": 60 * 60_000,
}

export async function fetchStockCandlesWithFallback(
  ticker: string,
  range: CandleRange,
  options: { alphaKey?: string; finnhubKey?: string },
): Promise<PriceCandle[]> {
  const sym = ticker.trim().toUpperCase()
  if (!sym) return []

  const cacheKey = `${sym}:${range}`
  const cached = candleCache.get(cacheKey)
  if (cached && Date.now() - cached.ts < CANDLE_CACHE_TTL[range]) {
    return cached.data
  }

  const providers: Promise<PriceCandle[]>[] = []
  if (options.finnhubKey) {
    providers.push(withTimeout(fetchFinnhubStockCandles(sym, options.finnhubKey, range), 5000, []))
  }
  if (options.alphaKey) {
    providers.push(withTimeout(fetchStockCandles(sym, options.alphaKey, range), 5000, []))
  }
  providers.push(withTimeout(fetchYahooFinanceCandles(sym, range), 5000, []))
  providers.push(withTimeout(fetchStooqDailyCandles(sym, range), 5000, []))

  const results = await Promise.all(providers)
  for (const r of results) {
    if (r.length > 0) {
      candleCache.set(cacheKey, { data: r, ts: Date.now() })
      return r
    }
  }
  return []
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
const VALID_US_EXCHANGES = new Set(["NYSE", "Nasdaq"])
const LISTING_CACHE_TTL_MS = 24 * 60 * 60 * 1000

const ECSE_LISTINGS: ListedStock[] = [
  { ticker: "BON",  name: "The Bank of Nevis Ltd",                                    exchange: "ECSE" },
  { ticker: "BOSV", name: "Bank of St Vincent and the Grenadines",                     exchange: "ECSE" },
  { ticker: "CWKN", name: "Cable & Wireless St. Kitts & Nevis",                        exchange: "ECSE" },
  { ticker: "DES",  name: "Dominica Electricity Services Ltd",                         exchange: "ECSE" },
  { ticker: "ECFH", name: "East Caribbean Financial Holding Co. Ltd",                  exchange: "ECSE" },
  { ticker: "GCBL", name: "Grenada Co-operative Bank Limited",                         exchange: "ECSE" },
  { ticker: "GESL", name: "Grenada Electricity Services Limited",                      exchange: "ECSE" },
  { ticker: "GPCL", name: "Grenreal Property Corporation Limited",                     exchange: "ECSE" },
  { ticker: "RBGL", name: "Republic Bank (Grenada) Limited",                           exchange: "ECSE" },
  { ticker: "SKNB", name: "St. Kitts Nevis Anguilla National Bank Ltd",                exchange: "ECSE" },
  { ticker: "SLES", name: "St. Lucia Electricity Services Ltd",                        exchange: "ECSE" },
  { ticker: "SLH",  name: "S. L. Horsford and Company Ltd",                            exchange: "ECSE" },
  { ticker: "TDC",  name: "St Kitts Nevis Anguilla Trading and Development Company Ltd", exchange: "ECSE" },
  { ticker: "WIOC", name: "West Indies Oil Company Limited",                           exchange: "ECSE" },
]

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
    if (!VALID_US_EXCHANGES.has(exchange) || !ticker || !name) continue
    if (ticker.includes(".") || ticker.includes("-") || ticker.includes("/")) continue

    stocks.push({ ticker, name, exchange })
  }

  stocks.push(...ECSE_LISTINGS)

  try {
    const euStocks = await fetchEuListings()
    stocks.push(...euStocks)
  } catch (e) {
    console.error("Failed to fetch EU listings from Wikipedia:", e)
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
