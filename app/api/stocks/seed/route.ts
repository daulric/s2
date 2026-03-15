import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { SupabaseClient } from "@supabase/supabase-js"
import { TOP_50_STOCKS } from "@/lib/stocks/types"
import { fetchFinnhubQuote } from "@/lib/stocks/api"

export async function GET() {
  const finnhubKey = process.env.FINNHUB_API_KEY
  if (!finnhubKey) {
    return NextResponse.json({ error: "Missing FINNHUB_API_KEY" }, { status: 500 })
  }

  const supabase = (await createClient()) as SupabaseClient

  const { error: upsertError } = await supabase.from("stocks").upsert(
    TOP_50_STOCKS.map((s) => ({
      ticker: s.ticker,
      name: s.name,
      sector: s.sector,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "ticker" },
  )

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  let priced = 0
  for (const stock of TOP_50_STOCKS) {
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
  }

  return NextResponse.json({
    message: `Seeded ${TOP_50_STOCKS.length} stocks, fetched prices for ${priced}`,
  })
}
