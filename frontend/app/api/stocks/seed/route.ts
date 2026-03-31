import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { SupabaseClient } from "@supabase/supabase-js"
import { fetchActiveListings, fetchFinnhubQuote, fetchYahooQuote } from "@/lib/stocks/api"
import { isEuTicker } from "@/lib/stocks/eu-listings"
import { isEcseTicker } from "@/lib/stocks/ecse-scraper"

const PRICE_BATCH_SIZE = 50
const YAHOO_BATCH_SIZE = 10
const PRICE_BATCH_DELAY_MS = 1_200
const YAHOO_BATCH_DELAY_MS = 600
const UPSERT_CHUNK_SIZE = 500

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function GET() {
  const finnhubKey = process.env.FINNHUB_API_KEY

  const supabase = (await createClient()) as SupabaseClient

  const listings = await fetchActiveListings()
  if (listings.length === 0) {
    return NextResponse.json({ error: "No listings returned from SEC EDGAR" }, { status: 500 })
  }

  const rows = listings.map((s) => ({
    ticker: s.ticker,
    name: s.name,
    exchange: s.exchange,
    sector: null,
    updated_at: new Date().toISOString(),
  }))

  for (let i = 0; i < rows.length; i += UPSERT_CHUNK_SIZE) {
    const chunk = rows.slice(i, i + UPSERT_CHUNK_SIZE)
    const { error } = await supabase
      .from("stocks")
      .upsert(chunk, { onConflict: "ticker" })

    if (error) {
      return NextResponse.json(
        { error: error.message, seeded: i },
        { status: 500 },
      )
    }
  }

  let usPriced = 0
  if (finnhubKey) {
    const usBatch = listings
      .filter(s => !isEuTicker(s.ticker) && !isEcseTicker(s.ticker))
      .slice(0, PRICE_BATCH_SIZE)
    for (const stock of usBatch) {
      try {
        const quote = await fetchFinnhubQuote(stock.ticker, finnhubKey)
        if (quote) {
          await supabase.from("stocks").update({
            last_price: quote.price,
            price_change_pct: quote.changePct,
            updated_at: new Date().toISOString(),
          }).eq("ticker", stock.ticker)
          usPriced++
        }
      } catch { /* continue */ }
      await delay(PRICE_BATCH_DELAY_MS)
    }
  }

  let nonUsPriced = 0
  const nonUsListings = listings.filter(s => isEuTicker(s.ticker) || isEcseTicker(s.ticker))
  for (let i = 0; i < nonUsListings.length; i += YAHOO_BATCH_SIZE) {
    const batch = nonUsListings.slice(i, i + YAHOO_BATCH_SIZE)
    await Promise.all(batch.map(async (stock) => {
      try {
        const quote = await fetchYahooQuote(stock.ticker)
        if (quote) {
          await supabase.from("stocks").update({
            last_price: quote.price,
            price_change_pct: quote.changePct,
            updated_at: new Date().toISOString(),
          }).eq("ticker", stock.ticker)
          nonUsPriced++
        }
      } catch { /* continue */ }
    }))
    if (i + YAHOO_BATCH_SIZE < nonUsListings.length) {
      await delay(YAHOO_BATCH_DELAY_MS)
    }
  }

  return NextResponse.json({
    message: `Seeded ${listings.length} stocks, priced ${usPriced} US + ${nonUsPriced} EU/ECSE`,
  })
}
