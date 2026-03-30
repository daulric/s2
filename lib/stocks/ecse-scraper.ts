import type { PriceCandle } from "./types"
import type { CandleRange } from "./api"

const ECSE_URL = "https://www.ecseonline.com/"
const ECSE_AJAX_URL = "https://www.ecseonline.com/wp-admin/admin-ajax.php"

export type EcseQuote = {
  ticker: string
  price: number
  change: number
}

const ECSE_TICKERS = new Set([
  "BON", "BOSV", "CWKN", "DES", "ECFH", "GCBL", "GESL",
  "GPCL", "RBGL", "SKNB", "SLES", "SLH", "TDC", "WIOC",
])

export function isEcseTicker(ticker: string): boolean {
  return ECSE_TICKERS.has(ticker.toUpperCase())
}

export async function scrapeEcseQuotes(): Promise<EcseQuote[]> {
  const res = await fetch(ECSE_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; S2StockApp/1.0; +https://rodrigo.co)",
    },
    cache: "no-store",
  })
  if (!res.ok) return []

  const html = await res.text()
  return parseEcseQuotesFromHtml(html)
}

export function parseEcseQuotesFromHtml(html: string): EcseQuote[] {
  const quotes: EcseQuote[] = []

  const priceBlockPattern =
    /\/profiles\/([A-Z]+)\/[^>]*>\s*<strong>([\d.]+)<\/strong>\s*<small>\([^$]*\$([\d.]+)\)<\/small>/gi

  let match: RegExpExecArray | null
  while ((match = priceBlockPattern.exec(html)) !== null) {
    const ticker = match[1]!.toUpperCase()
    const price = parseFloat(match[2]!)
    const change = parseFloat(match[3]!)
    if (!ECSE_TICKERS.has(ticker) || !Number.isFinite(price)) continue
    quotes.push({ ticker, price, change })
  }

  const seen = new Map<string, EcseQuote>()
  for (const q of quotes) {
    if (!seen.has(q.ticker)) seen.set(q.ticker, q)
  }
  return [...seen.values()]
}

type EcseAjaxTradeRow = {
  dailytrades_date: string
  dailytrades_symbol: string
  dailytrades_qty: string
  dailytrades_price: string
  dailytrades_change: string
  dailytrades_amt: string
}

/**
 * Fetches historical equity trades from the ECSE website's internal AJAX API.
 * This is the same endpoint the profile page charts use.
 */
export async function fetchEcseTradesFromApi(
  ticker: string,
  fromDate: string,
  toDate: string,
): Promise<PriceCandle[]> {
  const formData = new URLSearchParams()
  formData.append("action", "ecse_get_trade_data")
  formData.append("tradedata", "equities")
  formData.append("size", "1000000")
  formData.append("page", "1")
  formData.append("filters[0][field]", "dailytrades_symbol")
  formData.append("filters[0][value]", ticker.toUpperCase())
  formData.append("filters[0][type]", "=")
  formData.append("filters[1][field]", "dailytrades_date")
  formData.append("filters[1][type]", ">=")
  formData.append("filters[1][value]", fromDate)
  formData.append("filters[2][field]", "dailytrades_date")
  formData.append("filters[2][type]", "<=")
  formData.append("filters[2][value]", toDate)
  formData.append("sorters[0][field]", "dailytrades_date")
  formData.append("sorters[0][dir]", "ASC")

  try {
    const res = await fetch(ECSE_AJAX_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (compatible; S2StockApp/1.0)",
      },
      body: formData.toString(),
      cache: "no-store",
    })
    if (!res.ok) return []

    const json: { data?: EcseAjaxTradeRow[] } = await res.json()
    if (!json.data || !Array.isArray(json.data) || json.data.length === 0) return []

    // Aggregate multiple trades on the same day into a single candle
    const byDate = new Map<string, { prices: number[]; volumes: number[] }>()
    for (const row of json.data) {
      const date = row.dailytrades_date
      const price = parseFloat(row.dailytrades_price)
      const volume = parseInt(row.dailytrades_qty, 10) || 0
      if (!Number.isFinite(price)) continue

      const entry = byDate.get(date) ?? { prices: [], volumes: [] }
      entry.prices.push(price)
      entry.volumes.push(volume)
      byDate.set(date, entry)
    }

    const candles: PriceCandle[] = []
    for (const [date, { prices, volumes }] of byDate) {
      const open = prices[0]!
      const close = prices[prices.length - 1]!
      const high = Math.max(...prices)
      const low = Math.min(...prices)
      const volume = volumes.reduce((s, v) => s + v, 0)

      candles.push({
        date: `${date}T12:00:00Z`,
        open,
        high,
        low,
        close,
        volume,
      })
    }

    candles.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    return candles
  } catch {
    return []
  }
}

function candleRangeToFromDate(range: CandleRange): string {
  const now = new Date()
  const daysBack: Record<CandleRange, number> = {
    "1D": 2,
    "1W": 10,
    "1M": 35,
    "3M": 100,
    "1Y": 400,
    "5Y": 2000,
    "10Y": 4000,
    "ALL": 20000,
  }
  const d = daysBack[range] ?? 100
  const from = new Date(now.getTime() - d * 24 * 60 * 60 * 1000)
  return from.toISOString().split("T")[0]!
}

const ecseApiCache = new Map<string, { data: PriceCandle[]; ts: number }>()
const ECSE_CACHE_TTL: Record<CandleRange, number> = {
  "1D": 60_000,
  "1W": 5 * 60_000,
  "1M": 10 * 60_000,
  "3M": 15 * 60_000,
  "1Y": 30 * 60_000,
  "5Y": 60 * 60_000,
  "10Y": 60 * 60_000,
  "ALL": 60 * 60_000,
}

/**
 * Fetches ECSE candles for a given ticker and range.
 * Uses the ECSE website's internal trade data API directly.
 */
export async function fetchEcseCandles(
  ticker: string,
  range: CandleRange,
): Promise<PriceCandle[]> {
  const sym = ticker.toUpperCase()
  const cacheKey = `ecse:${sym}:${range}`
  const cached = ecseApiCache.get(cacheKey)
  if (cached && Date.now() - cached.ts < (ECSE_CACHE_TTL[range] ?? 60_000)) {
    return cached.data
  }

  const fromDate = candleRangeToFromDate(range)
  const toDate = new Date().toISOString().split("T")[0]!
  const candles = await fetchEcseTradesFromApi(sym, fromDate, toDate)

  ecseApiCache.set(cacheKey, { data: candles, ts: Date.now() })
  return candles
}
