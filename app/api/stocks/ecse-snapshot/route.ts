import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { SupabaseClient } from "@supabase/supabase-js"
import { scrapeEcseQuotes } from "@/lib/stocks/ecse-scraper"


export async function GET() {
  try {
    const quotes = await scrapeEcseQuotes()
    if (quotes.length === 0) {
      return NextResponse.json(
        { error: "Failed to scrape ECSE quotes — site may be down" },
        { status: 502 },
      )
    }

    const supabase = (await createClient()) as SupabaseClient
    const now = new Date().toISOString()

    const stockUpdates = quotes.map((q) =>
      supabase
        .from("stocks")
        .update({
          last_price: q.price,
          price_change_pct: q.price !== 0 ? (q.change / q.price) * 100 : 0,
          updated_at: now,
        })
        .eq("ticker", q.ticker),
    )
    await Promise.all(stockUpdates)

    return NextResponse.json({
      message: `Updated ${quotes.length} ECSE stock prices`,
      quotes,
    })
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 },
    )
  }
}
