import { coerceFiniteNumber } from "@/lib/stocks/coerce-stock-number"

const USD_DETAIL_OPTS = { minimumFractionDigits: 3, maximumFractionDigits: 4 } as const
const USD_LIST_OPTS = { minimumFractionDigits: 2, maximumFractionDigits: 2 } as const

export type StockPriceFormatVariant = "list" | "detail"

/**
 * - `detail` (default): ticker page / chart — 3–4 fractional digits.
 * - `list`: `/stocks` index — standard 2-decimal quotes.
 */
export function formatStockPriceUsd(
  price: number | null | undefined,
  variant: StockPriceFormatVariant = "detail",
): string {
  const n = coerceFiniteNumber(price as unknown)
  if (n == null) return "—"
  const opts = variant === "list" ? USD_LIST_OPTS : USD_DETAIL_OPTS
  return `$${n.toLocaleString("en-US", opts)}`
}

/** Y-axis ticks; same precision as quotes. */
export function formatStockAxisPriceUsd(value: number): string {
  const n = coerceFiniteNumber(value as unknown)
  if (n == null) return "—"
  return `$${n.toLocaleString("en-US", USD_DETAIL_OPTS)}`
}

/** Absolute $ change (no $ prefix); same 3–4 fractional digits as detail quotes. */
export function formatStockDollarChangeUsd(delta: number): string {
  const n = coerceFiniteNumber(delta as unknown)
  if (n == null) return "0.000"
  return n.toLocaleString("en-US", USD_DETAIL_OPTS)
}
