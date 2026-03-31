export type SentimentDir = "bullish" | "bearish" | "neutral"

export function articlePluralityDirection(
  bullish: number,
  bearish: number,
  neutral: number,
  modelDirection: SentimentDir | undefined | null,
): SentimentDir | null {
  const total = bullish + bearish + neutral
  if (total === 0) return null
  const rows: { dir: SentimentDir; n: number }[] = [
    { dir: "bullish", n: bullish },
    { dir: "bearish", n: bearish },
    { dir: "neutral", n: neutral },
  ]
  const maxN = Math.max(bullish, bearish, neutral)
  const leaders = rows.filter((r) => r.n === maxN).map((r) => r.dir)
  if (leaders.length === 1) return leaders[0]!
  if (modelDirection && leaders.includes(modelDirection)) return modelDirection
  const order: SentimentDir[] = ["bullish", "bearish", "neutral"]
  return order.find((d) => leaders.includes(d)) ?? "neutral"
}