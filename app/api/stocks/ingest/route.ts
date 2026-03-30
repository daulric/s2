import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { SupabaseClient } from "@supabase/supabase-js"
import {
  fetchAlphaVantageNewsSentiment,
  fetchFinnhubCompanyNews,
  fetchFinnhubQuote,
  fetchYahooQuote,
  computePrediction,
} from "@/lib/stocks/api"
import { isEuTicker } from "@/lib/stocks/eu-listings"
import { isEcseTicker } from "@/lib/stocks/ecse-scraper"
import { persistFinnhubArticlesIfNew } from "@/lib/stocks/persist-stock-articles"
import { backfillArticleSentimentsForTickers } from "@/lib/stocks/backfill-article-sentiments"

const BATCH_SIZE = 5
const BATCH_DELAY_MS = 15_000

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const alphaKey = process.env.ALPHAVANTAGE_API_KEY
  const finnhubKey = process.env.FINNHUB_API_KEY

  if (!alphaKey || !finnhubKey) {
    return NextResponse.json({ error: "Missing API keys" }, { status: 500 })
  }

  const supabase = (await createClient()) as SupabaseClient

  const { data: stockRows, error: stocksError } = await supabase
    .from("stocks")
    .select("ticker")

  if (stocksError || !stockRows || stockRows.length === 0) {
    return NextResponse.json(
      { error: stocksError?.message ?? "No stocks in database. Run /api/stocks/seed first." },
      { status: 500 },
    )
  }

  const allTickers = stockRows.map((r: { ticker: string }) => r.ticker)
  const results: { ticker: string; status: string }[] = []

  for (let i = 0; i < allTickers.length; i += BATCH_SIZE) {
    const batch = allTickers.slice(i, i + BATCH_SIZE)

    for (const ticker of batch) {
      try {
        const nonUs = isEuTicker(ticker) || isEcseTicker(ticker)
        const quote = nonUs
          ? await fetchYahooQuote(ticker)
          : await fetchFinnhubQuote(ticker, finnhubKey)
        if (quote) {
          await supabase.from("stocks").update({
            last_price: quote.price,
            price_change_pct: quote.changePct,
            updated_at: new Date().toISOString(),
          }).eq("ticker", ticker)
        }
      } catch {
        // price fetch failed, continue
      }
    }

    try {
      const { articles, sentiments } = await fetchAlphaVantageNewsSentiment(batch, alphaKey)

      for (const article of articles) {
        const { data: existing } = await supabase
          .from("stock_articles")
          .select("id")
          .eq("ticker", article.ticker)
          .eq("headline", article.headline)
          .single()

        if (existing) continue

        const { data: inserted } = await supabase
          .from("stock_articles")
          .insert(article)
          .select("id")
          .single()

        if (!inserted) continue

        const matchingSentiment = sentiments.find(
          (s) => s.ticker === article.ticker && s.headline === article.headline,
        )
        if (matchingSentiment) {
          await supabase.from("article_sentiments").insert({
            article_id: inserted.id,
            ticker: matchingSentiment.ticker,
            sentiment_score: matchingSentiment.score,
            sentiment_label: matchingSentiment.label,
            confidence: matchingSentiment.confidence,
            model_used: "alphavantage",
          })
        }
      }

      for (const ticker of batch) {
        try {
          const finnhubNews = await fetchFinnhubCompanyNews(ticker, finnhubKey, 7)
          await persistFinnhubArticlesIfNew(supabase, ticker.toUpperCase(), finnhubNews)
        } catch {
          // Finnhub or persist failed for this ticker
        }
      }

      await backfillArticleSentimentsForTickers(
        supabase,
        batch.map((t) => t.toUpperCase()),
        alphaKey,
      )

      for (const ticker of batch) {
        const { data: recentSentiments } = await supabase
          .from("article_sentiments")
          .select("sentiment_score, confidence")
          .eq("ticker", ticker)
          .order("created_at", { ascending: false })
          .limit(50)

        const items = (recentSentiments ?? []).map((s: { sentiment_score: number; confidence: number }) => ({
          score: s.sentiment_score,
          confidence: s.confidence,
        }))

        const prediction = computePrediction(items)

        await supabase.from("stock_predictions").insert({
          ticker,
          direction: prediction.direction,
          score: prediction.score,
          confidence: prediction.confidence,
          article_count: items.length,
          timeframe: "24h",
        })

        results.push({ ticker, status: "ok" })
      }
    } catch (err) {
      for (const ticker of batch) {
        results.push({ ticker, status: `error: ${err instanceof Error ? err.message : "unknown"}` })
      }
    }

    if (i + BATCH_SIZE < allTickers.length) {
      await delay(BATCH_DELAY_MS)
    }
  }

  return NextResponse.json({
    message: `Ingested ${results.filter((r) => r.status === "ok").length}/${allTickers.length} stocks`,
    results,
    timestamp: new Date().toISOString(),
  })
}
