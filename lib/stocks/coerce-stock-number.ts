import type { Stock } from "@/lib/stocks/types"

/** Supabase/Postgres `numeric` often arrives as a string over the wire. */
export function coerceFiniteNumber(value: unknown): number | null {
  if (value == null) return null
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value === "string") {
    const t = value.trim()
    if (t === "") return null
    const n = Number(t)
    return Number.isFinite(n) ? n : null
  }
  if (typeof value === "bigint") return Number(value)
  return null
}

export function parseStockRow(stock: Stock): Stock {
  return {
    ...stock,
    last_price: coerceFiniteNumber(stock.last_price as unknown),
    price_change_pct: coerceFiniteNumber(stock.price_change_pct as unknown),
    volume: coerceFiniteNumber(stock.volume as unknown),
    market_cap: coerceFiniteNumber(stock.market_cap as unknown),
  }
}
