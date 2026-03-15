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

export const TOP_50_STOCKS = [
  { ticker: "AAPL", name: "Apple Inc.", sector: "Technology" },
  { ticker: "MSFT", name: "Microsoft Corp.", sector: "Technology" },
  { ticker: "GOOGL", name: "Alphabet Inc.", sector: "Technology" },
  { ticker: "AMZN", name: "Amazon.com Inc.", sector: "Consumer Cyclical" },
  { ticker: "NVDA", name: "NVIDIA Corp.", sector: "Technology" },
  { ticker: "META", name: "Meta Platforms Inc.", sector: "Technology" },
  { ticker: "TSLA", name: "Tesla Inc.", sector: "Consumer Cyclical" },
  { ticker: "BRK.B", name: "Berkshire Hathaway", sector: "Financials" },
  { ticker: "JPM", name: "JPMorgan Chase", sector: "Financials" },
  { ticker: "V", name: "Visa Inc.", sector: "Financials" },
  { ticker: "JNJ", name: "Johnson & Johnson", sector: "Healthcare" },
  { ticker: "WMT", name: "Walmart Inc.", sector: "Consumer Defensive" },
  { ticker: "MA", name: "Mastercard Inc.", sector: "Financials" },
  { ticker: "PG", name: "Procter & Gamble", sector: "Consumer Defensive" },
  { ticker: "UNH", name: "UnitedHealth Group", sector: "Healthcare" },
  { ticker: "HD", name: "The Home Depot", sector: "Consumer Cyclical" },
  { ticker: "DIS", name: "Walt Disney Co.", sector: "Communication" },
  { ticker: "BAC", name: "Bank of America", sector: "Financials" },
  { ticker: "XOM", name: "Exxon Mobil Corp.", sector: "Energy" },
  { ticker: "KO", name: "Coca-Cola Co.", sector: "Consumer Defensive" },
  { ticker: "PFE", name: "Pfizer Inc.", sector: "Healthcare" },
  { ticker: "CSCO", name: "Cisco Systems", sector: "Technology" },
  { ticker: "ADBE", name: "Adobe Inc.", sector: "Technology" },
  { ticker: "CRM", name: "Salesforce Inc.", sector: "Technology" },
  { ticker: "NFLX", name: "Netflix Inc.", sector: "Communication" },
  { ticker: "AMD", name: "AMD Inc.", sector: "Technology" },
  { ticker: "INTC", name: "Intel Corp.", sector: "Technology" },
  { ticker: "ORCL", name: "Oracle Corp.", sector: "Technology" },
  { ticker: "ABT", name: "Abbott Laboratories", sector: "Healthcare" },
  { ticker: "NKE", name: "Nike Inc.", sector: "Consumer Cyclical" },
  { ticker: "T", name: "AT&T Inc.", sector: "Communication" },
  { ticker: "VZ", name: "Verizon Communications", sector: "Communication" },
  { ticker: "PEP", name: "PepsiCo Inc.", sector: "Consumer Defensive" },
  { ticker: "CMCSA", name: "Comcast Corp.", sector: "Communication" },
  { ticker: "AVGO", name: "Broadcom Inc.", sector: "Technology" },
  { ticker: "COST", name: "Costco Wholesale", sector: "Consumer Defensive" },
  { ticker: "MRK", name: "Merck & Co.", sector: "Healthcare" },
  { ticker: "CVX", name: "Chevron Corp.", sector: "Energy" },
  { ticker: "LLY", name: "Eli Lilly & Co.", sector: "Healthcare" },
  { ticker: "QCOM", name: "Qualcomm Inc.", sector: "Technology" },
  { ticker: "TMO", name: "Thermo Fisher Scientific", sector: "Healthcare" },
  { ticker: "MCD", name: "McDonald's Corp.", sector: "Consumer Cyclical" },
  { ticker: "LOW", name: "Lowe's Companies", sector: "Consumer Cyclical" },
  { ticker: "GS", name: "Goldman Sachs", sector: "Financials" },
  { ticker: "MS", name: "Morgan Stanley", sector: "Financials" },
  { ticker: "SBUX", name: "Starbucks Corp.", sector: "Consumer Cyclical" },
  { ticker: "PYPL", name: "PayPal Holdings", sector: "Financials" },
  { ticker: "IBM", name: "IBM Corp.", sector: "Technology" },
  { ticker: "GE", name: "GE Aerospace", sector: "Industrials" },
  { ticker: "CAT", name: "Caterpillar Inc.", sector: "Industrials" },
] as const
