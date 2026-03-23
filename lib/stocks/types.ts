export type Stock = {
  ticker: string
  name: string
  sector: string | null
  last_price: number | null
  price_change_pct: number | null
  volume: number | null
  market_cap: number | null
  updated_at: string
}

export type StockArticle = {
  id: string
  ticker: string
  source: string
  headline: string
  summary: string | null
  url: string | null
  image_url: string | null
  published_at: string
  created_at: string
}

export type ArticleSentiment = {
  id: string
  article_id: string
  ticker: string
  sentiment_score: number
  sentiment_label: "bullish" | "bearish" | "neutral"
  confidence: number
  model_used: string
  created_at: string
}

export type StockPrediction = {
  id: string
  ticker: string
  direction: "bullish" | "bearish" | "neutral"
  score: number
  confidence: number
  article_count: number
  timeframe: string
  created_at: string
}

export type UserWatchlistEntry = {
  id: string
  user_id: string
  ticker: string
  created_at: string
}

export type StockWithPrediction = Stock & {
  prediction: StockPrediction | null
  article_count: number
  sentiment_avg: number | null
  article_majority_direction: "bullish" | "bearish" | "neutral" | null
}

export type PriceCandle = {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type StockDetail = Stock & {
  prediction: StockPrediction | null
  articles: (StockArticle & { sentiment: ArticleSentiment | null })[]
  prediction_history: StockPrediction[]
  candles: PriceCandle[]
}

export type ListedStock = {
  ticker: string
  name: string
  exchange: string
}
