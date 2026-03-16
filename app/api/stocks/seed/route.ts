import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { SupabaseClient } from "@supabase/supabase-js"
import { fetchActiveListings, fetchFinnhubQuote } from "@/lib/stocks/api"

const PRICE_BATCH_SIZE = 50
const PRICE_BATCH_DELAY_MS = 1_200
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
    sector: null,
    updated_at: new Date().toISOString(),
  }))

  for (let i = 0; i < rows.length; i += UPSERT_CHUNK_SIZE) {
    const chunk = rows.slice(i, i + UPSERT_CHUNK_SIZE)
    const { error } = await supabase
      .from("stocks")
      .upsert(chunk, { onConflict: "ticker", ignoreDuplicates: true })

    if (error) {
      return NextResponse.json(
        { error: error.message, seeded: i },
        { status: 500 },
      )
    }
  }

  let priced = 0
  if (finnhubKey) {
    const priceBatch = listings.slice(0, PRICE_BATCH_SIZE)
    for (const stock of priceBatch) {
      try {
        const quote = await fetchFinnhubQuote(stock.ticker, finnhubKey)
        if (quote) {
          await supabase.from("stocks").update({
            last_price: quote.price,
            price_change_pct: quote.changePct,
            updated_at: new Date().toISOString(),
          }).eq("ticker", stock.ticker)
          priced++
        }
      } catch {
        // continue
      }
      await delay(PRICE_BATCH_DELAY_MS)
    }
  }

  return NextResponse.json({
    message: `Seeded ${listings.length} stocks, fetched prices for ${priced}`,
  })
}
