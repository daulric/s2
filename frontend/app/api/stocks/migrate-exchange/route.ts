import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { SupabaseClient } from "@supabase/supabase-js"
import { fetchActiveListings } from "@/lib/stocks/api"

const UPSERT_CHUNK_SIZE = 500

export async function GET() {
  const supabase = (await createClient()) as SupabaseClient
  const schema = process.env.NEXT_PUBLIC_SCHEMA || "public"

  const { error: alterError } = await supabase.rpc("exec_sql", {
    query: `ALTER TABLE "${schema}".stocks ADD COLUMN IF NOT EXISTS exchange text`,
  }).single()

  let usedRpc = true
  if (alterError) {
    usedRpc = false
  }

  const listings = await fetchActiveListings()
  if (listings.length === 0) {
    return NextResponse.json({ error: "No listings fetched" }, { status: 500 })
  }

  const rows = listings.map((s) => ({
    ticker: s.ticker,
    name: s.name,
    exchange: s.exchange,
    sector: null as string | null,
    updated_at: new Date().toISOString(),
  }))

  let upserted = 0
  for (let i = 0; i < rows.length; i += UPSERT_CHUNK_SIZE) {
    const chunk = rows.slice(i, i + UPSERT_CHUNK_SIZE)
    const { error } = await supabase
      .from("stocks")
      .upsert(chunk, { onConflict: "ticker" })

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
          hint: !usedRpc
            ? "The 'exchange' column may not exist yet. Run this SQL in Supabase: ALTER TABLE stocks ADD COLUMN IF NOT EXISTS exchange text;"
            : undefined,
          upserted,
        },
        { status: 500 },
      )
    }
    upserted += chunk.length
  }

  const ecseCount = listings.filter((l) => l.exchange === "ECSE").length

  return NextResponse.json({
    message: `Upserted ${upserted} stocks (${ecseCount} ECSE). Exchange column ${usedRpc ? "added via RPC" : "may need manual ALTER TABLE"}.`,
  })
}
