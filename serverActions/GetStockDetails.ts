"use server"

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
import { fetchStockCandles, type CandleRange } from "@/lib/stocks/api"
import { SupabaseClient } from "@supabase/supabase-js"

export async function GetAllStocks(): Promise<StockWithPrediction[]> {
  const supabase = (await createClient()) as SupabaseClient

  const allStocks: Stock[] = []
  const PAGE = 1000
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from("stocks")
      .select("*")
      .order("ticker")
      .range(from, from + PAGE - 1)

    if (error || !data || data.length === 0) break
    allStocks.push(...(data as Stock[]))
    if (data.length < PAGE) break
    from += PAGE
  }

  if (allStocks.length === 0) return []

  const tickers = allStocks.map((s) => s.ticker)

  const { data: predictions } = await supabase
    .from("stock_predictions")
    .select("*")
    .in("ticker", tickers)
    .order("created_at", { ascending: false })

  const { data: sentimentCounts } = await supabase
    .from("article_sentiments")
    .select("ticker, sentiment_score")
    .in("ticker", tickers)

  const latestPredictions = new Map<string, StockPrediction>()
  for (const p of (predictions ?? []) as StockPrediction[]) {
    if (!latestPredictions.has(p.ticker)) {
      latestPredictions.set(p.ticker, p)
    }
  }

  const sentimentMap = new Map<string, { total: number; count: number }>()
  for (const s of (sentimentCounts ?? []) as { ticker: string; sentiment_score: number }[]) {
    const entry = sentimentMap.get(s.ticker) ?? { total: 0, count: 0 }
    entry.total += s.sentiment_score
    entry.count += 1
    sentimentMap.set(s.ticker, entry)
  }

  return allStocks.map((stock) => {
    const sentEntry = sentimentMap.get(stock.ticker)
    return {
      ...stock,
      prediction: latestPredictions.get(stock.ticker) ?? null,
      article_count: sentEntry?.count ?? 0,
      sentiment_avg: sentEntry ? sentEntry.total / sentEntry.count : null,
    }
  })
}

export async function GetStockDetail(ticker: string): Promise<StockDetail | null> {
  const supabase = (await createClient()) as SupabaseClient

  const { data: stock, error } = await supabase
    .from("stocks")
    .select("*")
    .eq("ticker", ticker.toUpperCase())
    .single()

  if (error || !stock) return null

  const [articlesRes, sentimentsRes, predictionsRes] = await Promise.all([
    supabase
      .from("stock_articles")
      .select("*")
      .eq("ticker", ticker.toUpperCase())
      .order("published_at", { ascending: false })
      .limit(30),
    supabase
      .from("article_sentiments")
      .select("*")
      .eq("ticker", ticker.toUpperCase())
      .order("created_at", { ascending: false }),
    supabase
      .from("stock_predictions")
      .select("*")
      .eq("ticker", ticker.toUpperCase())
      .order("created_at", { ascending: false })
      .limit(30),
  ])

  const articles = (articlesRes.data ?? []) as StockArticle[]
  const sentiments = (sentimentsRes.data ?? []) as ArticleSentiment[]
  const predictions = (predictionsRes.data ?? []) as StockPrediction[]

  const sentimentByArticle = new Map<string, ArticleSentiment>()
  for (const s of sentiments) {
    if (!sentimentByArticle.has(s.article_id)) {
      sentimentByArticle.set(s.article_id, s)
    }
  }

  let candles: PriceCandle[] = []
  const alphaKey = process.env.ALPHAVANTAGE_API_KEY
  if (alphaKey) {
    candles = await fetchStockCandles(ticker.toUpperCase(), alphaKey, "1M")
  }

  return {
    ...(stock as Stock),
    prediction: predictions[0] ?? null,
    articles: articles.map((a) => ({
      ...a,
      sentiment: sentimentByArticle.get(a.id) ?? null,
    })),
    prediction_history: predictions,
    candles,
  }
}

export async function GetStockCandles(
  ticker: string,
  range: CandleRange,
): Promise<PriceCandle[]> {
  const alphaKey = process.env.ALPHAVANTAGE_API_KEY
  if (!alphaKey) return []
  return fetchStockCandles(ticker.toUpperCase(), alphaKey, range)
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
    .filter((s) => s.prediction !== null)
    .sort((a, b) => Math.abs(b.prediction?.score ?? 0) - Math.abs(a.prediction?.score ?? 0))
    .slice(0, limit)
}
