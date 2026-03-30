"use server"

import { createHash } from "node:crypto"
import { after } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type {
  Stock,
  StockWithPrediction,
  StockDetail,
  StockPrediction,
  StockArticle,
  ArticleSentiment,
  UserWatchlistEntry,
  PriceCandle,
} from "@/lib/stocks/types"
import {
  fetchFinnhubCompanyNews,
  fetchStockCandlesWithFallback,
  type CandleRange,
} from "@/lib/stocks/api"
import { isEcseTicker, fetchEcseCandles } from "@/lib/stocks/ecse-scraper"
import { isEuTicker } from "@/lib/stocks/eu-listings"
import { parseStockRow } from "@/lib/stocks/coerce-stock-number"
import { persistFinnhubArticlesIfNew } from "@/lib/stocks/persist-stock-articles"
import { backfillArticleSentimentsForTickers } from "@/lib/stocks/backfill-article-sentiments"
import { articlePluralityDirection } from "@/lib/stocks/article-sentiment-plurality"
import { SupabaseClient } from "@supabase/supabase-js"

const ARTICLE_ID_IN_CHUNK = 200

async function fetchSentimentsByArticleIds(
  supabase: SupabaseClient,
  articleIds: string[],
): Promise<ArticleSentiment[]> {
  if (articleIds.length === 0) return []

  const chunks: Promise<ArticleSentiment[]>[] = []
  for (let i = 0; i < articleIds.length; i += ARTICLE_ID_IN_CHUNK) {
    const chunk = articleIds.slice(i, i + ARTICLE_ID_IN_CHUNK)
    chunks.push(
      Promise.resolve(
        supabase
          .from("article_sentiments")
          .select("id, article_id, ticker, sentiment_score, sentiment_label, confidence, model_used, created_at")
          .in("article_id", chunk)
          .order("created_at", { ascending: false })
          .then(({ data }) => (data as ArticleSentiment[] | null) ?? []),
      ),
    )
  }
  const results = await Promise.all(chunks)
  const merged = results.flat()

  const sentimentByArticle = new Map<string, ArticleSentiment>()
  for (const s of merged) {
    if (!sentimentByArticle.has(s.article_id)) {
      sentimentByArticle.set(s.article_id, s)
    }
  }
  return [...sentimentByArticle.values()]
}

function stockArticleDedupeKey(a: { url: string | null; headline: string }): string {
  const u = a.url?.trim().toLowerCase()
  if (u) return `u:${u}`
  return `h:${a.headline.trim().toLowerCase()}`
}

type StockArticleWithSentiment = StockArticle & { sentiment: ArticleSentiment | null }

function mergeDbArticlesWithLiveNews(
  dbRows: StockArticleWithSentiment[],
  live: Omit<StockArticle, "id" | "created_at">[],
  tickerUpper: string,
): StockArticleWithSentiment[] {
  const dbByKey = new Map<string, StockArticleWithSentiment>()
  for (const row of dbRows) {
    const k = stockArticleDedupeKey(row)
    if (!dbByKey.has(k)) dbByKey.set(k, row)
  }

  const usedDbIds = new Set<string>()
  const merged: StockArticleWithSentiment[] = []
  const seenLiveKeys = new Set<string>()

  const finnhubSorted = [...live].sort(
    (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime(),
  )

  for (const f of finnhubSorted) {
    const k = stockArticleDedupeKey(f)
    if (seenLiveKeys.has(k)) continue
    seenLiveKeys.add(k)

    const dbMatch = dbByKey.get(k)
    if (dbMatch && !usedDbIds.has(dbMatch.id)) {
      merged.push(dbMatch)
      usedDbIds.add(dbMatch.id)
      continue
    }

    const hash = createHash("sha256").update(`${k}:${f.published_at}`).digest("hex").slice(0, 24)
    merged.push({
      id: `live-${hash}`,
      ticker: tickerUpper,
      source: f.source,
      headline: f.headline,
      summary: f.summary,
      url: f.url,
      image_url: f.image_url,
      published_at: f.published_at,
      created_at: f.published_at,
      sentiment: null,
    })
  }

  for (const row of dbRows) {
    if (!usedDbIds.has(row.id)) merged.push(row)
  }

  merged.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
  return merged.slice(0, 30)
}

const STOCK_LIST_COLS = "ticker, name, exchange, sector, last_price, price_change_pct, volume, market_cap, updated_at"

async function fetchAllStocksFromDb(): Promise<StockWithPrediction[]> {
  const supabase = (await createClient()) as SupabaseClient

  const stockPages: Promise<Stock[]>[] = []
  const PAGE = 1000
  const { count } = await supabase.from("stocks").select("ticker", { count: "exact", head: true })
  const total = count ?? 0

  for (let from = 0; from < total; from += PAGE) {
    stockPages.push(
      Promise.resolve(
        supabase
          .from("stocks")
          .select(STOCK_LIST_COLS)
          .order("ticker")
          .range(from, from + PAGE - 1)
          .then(({ data }) => (data as Stock[] | null)?.map(parseStockRow) ?? []),
      ),
    )
  }

  const allStocks = (await Promise.all(stockPages)).flat()
  if (allStocks.length === 0) return []

  const [predictions, sentimentRows] = await Promise.all([
    supabase
      .from("stock_predictions")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => (data as StockPrediction[] | null) ?? []),
    supabase
      .from("article_sentiments")
      .select("ticker, sentiment_score, sentiment_label")
      .then(({ data }) => (data as { ticker: string; sentiment_score: number; sentiment_label: "bullish" | "bearish" | "neutral" }[] | null) ?? []),
  ])

  const latestPredictions = new Map<string, StockPrediction>()
  for (const p of predictions) {
    if (!latestPredictions.has(p.ticker)) {
      latestPredictions.set(p.ticker, p)
    }
  }

  type SentimentAgg = { bullish: number; bearish: number; neutral: number; scoreSum: number; count: number }
  const sentimentMap = new Map<string, SentimentAgg>()
  for (const s of sentimentRows) {
    const entry = sentimentMap.get(s.ticker) ?? { bullish: 0, bearish: 0, neutral: 0, scoreSum: 0, count: 0 }
    if (s.sentiment_label === "bullish") entry.bullish += 1
    else if (s.sentiment_label === "bearish") entry.bearish += 1
    else entry.neutral += 1
    entry.scoreSum += Number(s.sentiment_score)
    entry.count += 1
    sentimentMap.set(s.ticker, entry)
  }

  return allStocks.map((stock) => {
    const agg = sentimentMap.get(stock.ticker)
    const prediction = latestPredictions.get(stock.ticker) ?? null
    const article_count = agg?.count ?? 0
    const sentiment_avg = agg && agg.count > 0 ? agg.scoreSum / agg.count : null
    const article_majority_direction =
      agg && agg.count > 0
        ? articlePluralityDirection(agg.bullish, agg.bearish, agg.neutral, prediction?.direction)
        : null

    return { ...stock, prediction, article_count, sentiment_avg, article_majority_direction }
  })
}

let allStocksCache: { data: StockWithPrediction[]; ts: number } | null = null
const ALL_STOCKS_TTL_MS = 60_000

export async function GetAllStocks(): Promise<StockWithPrediction[]> {
  if (allStocksCache && Date.now() - allStocksCache.ts < ALL_STOCKS_TTL_MS) {
    return allStocksCache.data
  }
  const data = await fetchAllStocksFromDb()
  allStocksCache = { data, ts: Date.now() }
  return data
}

export async function GetStockDetail(ticker: string): Promise<StockDetail | null> {
  const supabase = (await createClient()) as SupabaseClient
  const tickerUpper = ticker.toUpperCase()
  const alphaKey = process.env.ALPHAVANTAGE_API_KEY
  const finnhubKey = process.env.FINNHUB_API_KEY

  const ecse = isEcseTicker(tickerUpper)
  const eu = isEuTicker(tickerUpper)
  const usStock = !ecse && !eu

  const candlePromise = ecse
    ? fetchEcseCandles(tickerUpper, "3M")
    : eu
      ? fetchStockCandlesWithFallback(tickerUpper, "3M", {})
      : alphaKey || finnhubKey
        ? fetchStockCandlesWithFallback(tickerUpper, "3M", { alphaKey, finnhubKey })
        : Promise.resolve([] as PriceCandle[])

  const newsPromise = usStock && finnhubKey
    ? fetchFinnhubCompanyNews(tickerUpper, finnhubKey, 7).catch(() => [] as Omit<StockArticle, "id" | "created_at">[])
    : Promise.resolve([] as Omit<StockArticle, "id" | "created_at">[])

  const [stockRes, articlesRes, predictionsRes, candles, liveNews] = await Promise.all([
    supabase.from("stocks").select("*").eq("ticker", tickerUpper).single(),
    supabase
      .from("stock_articles")
      .select("*")
      .eq("ticker", tickerUpper)
      .order("published_at", { ascending: false })
      .limit(60),
    supabase
      .from("stock_predictions")
      .select("*")
      .eq("ticker", tickerUpper)
      .order("created_at", { ascending: false })
      .limit(30),
    candlePromise,
    newsPromise,
  ])

  const { data: stock, error } = stockRes
  if (error || !stock) return null

  const stockBase = parseStockRow(stock as Stock)
  const articles = (articlesRes.data ?? []) as StockArticle[]
  const predictions = (predictionsRes.data ?? []) as StockPrediction[]

  const dbArticleIds = articles.map((a) => a.id)
  const sentimentRows = await fetchSentimentsByArticleIds(supabase, dbArticleIds)
  const sentimentByArticle = new Map<string, ArticleSentiment>(
    sentimentRows.map((s) => [s.article_id, s]),
  )

  const dbArticlesWithSentiment: StockArticleWithSentiment[] = articles.map((a) => ({
    ...a,
    sentiment: sentimentByArticle.get(a.id) ?? null,
  }))

  const articlesMerged =
    liveNews.length > 0
      ? mergeDbArticlesWithLiveNews(dbArticlesWithSentiment, liveNews, tickerUpper)
      : dbArticlesWithSentiment.slice(0, 30)

  after(async () => {
    try {
      const sb = (await createClient()) as SupabaseClient
      if (liveNews.length > 0) {
        await persistFinnhubArticlesIfNew(sb, tickerUpper, liveNews)
      }
      await backfillArticleSentimentsForTickers(sb, [tickerUpper], alphaKey)
    } catch {
      // next visit or cron will pick up persistence
    }
  })

  const lastCandleClose = candles.length > 0 ? candles[candles.length - 1]!.close : null
  const last_price = stockBase.last_price ?? lastCandleClose

  return {
    ...stockBase,
    last_price,
    prediction: predictions[0] ?? null,
    articles: articlesMerged,
    prediction_history: predictions,
    candles,
  }
}

export async function GetStockCandles(
  ticker: string,
  range: CandleRange,
): Promise<PriceCandle[]> {
  const sym = ticker.toUpperCase()
  if (isEcseTicker(sym)) {
    return fetchEcseCandles(sym, range)
  }
  if (isEuTicker(sym)) {
    return fetchStockCandlesWithFallback(sym, range, {})
  }
  return fetchStockCandlesWithFallback(sym, range, {
    alphaKey: process.env.ALPHAVANTAGE_API_KEY,
    finnhubKey: process.env.FINNHUB_API_KEY,
  })
}

export async function GetUserWatchlist(): Promise<UserWatchlistEntry[]> {
  const supabase = (await createClient()) as SupabaseClient
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from("user_watchlists")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) return []
  return (data ?? []) as UserWatchlistEntry[]
}

export async function ToggleWatchlist(ticker: string): Promise<{ added: boolean }> {
  const supabase = (await createClient()) as SupabaseClient
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { data: existing } = await supabase
    .from("user_watchlists")
    .select("id")
    .eq("user_id", user.id)
    .eq("ticker", ticker.toUpperCase())
    .single()

  if (existing) {
    await supabase
      .from("user_watchlists")
      .delete()
      .eq("id", existing.id)
    return { added: false }
  }

  await supabase
    .from("user_watchlists")
    .insert({ user_id: user.id, ticker: ticker.toUpperCase() })
  return { added: true }
}

export async function GetTopMovers(limit = 10): Promise<StockWithPrediction[]> {
  const all = await GetAllStocks()
  return all
    .filter((s) => s.prediction !== null || s.article_count > 0)
    .sort((a, b) => {
      const scoreA = a.prediction?.score ?? a.sentiment_avg ?? 0
      const scoreB = b.prediction?.score ?? b.sentiment_avg ?? 0
      return Math.abs(scoreB) - Math.abs(scoreA)
    })
    .slice(0, limit)
}
