import type { StockArticle, ListedStock } from './types';
import { fetchEuListings, isEuTicker } from './eu-listings';

const ALPHAVANTAGE_BASE = 'https://www.alphavantage.co/query';
const FINNHUB_BASE = 'https://finnhub.io/api/v1';

type AlphaVantageSentimentItem = {
  title: string;
  url: string;
  summary: string;
  banner_image?: string;
  source: string;
  time_published: string;
  overall_sentiment_score: number;
  overall_sentiment_label: string;
  ticker_sentiment?: {
    ticker: string;
    relevance_score: string;
    ticker_sentiment_score: string;
    ticker_sentiment_label: string;
  }[];
};

type FinnhubQuoteResponse = {
  c: number;
  d: number;
  dp: number;
  h: number;
  l: number;
  o: number;
  pc: number;
  t: number;
};

export async function fetchAlphaVantageNewsSentiment(
  tickers: string[],
  apiKey: string,
): Promise<{
  articles: Omit<StockArticle, 'id' | 'created_at'>[];
  sentiments: { headline: string; ticker: string; score: number; label: string; confidence: number }[];
}> {
  const tickerParam = tickers.join(',');
  const url = `${ALPHAVANTAGE_BASE}?function=NEWS_SENTIMENT&tickers=${tickerParam}&apikey=${apiKey}&limit=50`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Alpha Vantage error: ${res.status}`);
  const data = await res.json();

  if (!data.feed) return { articles: [], sentiments: [] };

  const tickerSetUpper = new Set(tickers.map((t) => t.toUpperCase()));

  const articles: Omit<StockArticle, 'id' | 'created_at'>[] = [];
  const sentiments: { headline: string; ticker: string; score: number; label: string; confidence: number }[] = [];

  for (const item of data.feed as AlphaVantageSentimentItem[]) {
    const publishedAt = parseAlphaVantageDate(item.time_published);

    const tickerSentiments = item.ticker_sentiment ?? [];
    for (const ts of tickerSentiments) {
      if (!tickerSetUpper.has(ts.ticker.toUpperCase())) continue;

      articles.push({
        ticker: ts.ticker.toUpperCase(),
        source: item.source,
        headline: item.title,
        summary: item.summary?.slice(0, 500) ?? null,
        url: item.url,
        image_url: item.banner_image ?? null,
        published_at: publishedAt,
      });

      const score = parseFloat(ts.ticker_sentiment_score);
      sentiments.push({
        headline: item.title,
        ticker: ts.ticker.toUpperCase(),
        score: Math.max(-1, Math.min(1, score)),
        label: score > 0.15 ? 'bullish' : score < -0.15 ? 'bearish' : 'neutral',
        confidence: Math.min(1, parseFloat(ts.relevance_score)),
      });
    }
  }

  return { articles, sentiments };
}

export async function fetchFinnhubQuote(
  ticker: string,
  apiKey: string,
): Promise<{ price: number; changePct: number } | null> {
  const url = `${FINNHUB_BASE}/quote?symbol=${ticker}&token=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data: FinnhubQuoteResponse = await res.json();
  if (!data.c) return null;
  return { price: data.c, changePct: data.dp };
}

export async function fetchYahooQuote(
  ticker: string,
): Promise<{ price: number; changePct: number } | null> {
  const trimmed = ticker.trim().toUpperCase();
  const yahooSymbol = isEuTicker(trimmed) ? trimmed : trimmed.replace(/\./g, '-');
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=5d&interval=1d`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice) return null;

    const price = meta.regularMarketPrice as number;
    const prevClose = (meta.chartPreviousClose ?? meta.previousClose) as number | undefined;
    const changePct =
      prevClose && prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;

    return { price, changePct };
  } catch {
    return null;
  }
}

export async function fetchFinnhubCompanyNews(
  ticker: string,
  apiKey: string,
  daysBack = 3,
): Promise<Omit<StockArticle, 'id' | 'created_at'>[]> {
  const to = new Date();
  const from = new Date(to.getTime() - daysBack * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().split('T')[0];

  const url = `${FINNHUB_BASE}/company-news?symbol=${ticker}&from=${fmt(from)}&to=${fmt(to)}&token=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data)) return [];

  return data
    .slice(0, 20)
    .map(
      (item: {
        source: string;
        headline: string;
        summary: string;
        url: string;
        image: string;
        datetime: number;
      }) => ({
        ticker,
        source: item.source,
        headline: item.headline,
        summary: item.summary?.slice(0, 500) ?? null,
        url: item.url,
        image_url: item.image || null,
        published_at: new Date(item.datetime * 1000).toISOString(),
      }),
    );
}

export function computePrediction(sentiments: { score: number; confidence: number }[]): {
  direction: 'bullish' | 'bearish' | 'neutral';
  score: number;
  confidence: number;
} {
  if (sentiments.length === 0) return { direction: 'neutral', score: 0, confidence: 0 };

  let weightedSum = 0;
  let totalWeight = 0;
  for (const s of sentiments) {
    weightedSum += s.score * s.confidence;
    totalWeight += s.confidence;
  }

  const avgScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
  const avgConfidence = totalWeight / sentiments.length;

  const direction: 'bullish' | 'bearish' | 'neutral' =
    avgScore > 0.1 ? 'bullish' : avgScore < -0.1 ? 'bearish' : 'neutral';

  return {
    direction,
    score: Math.round(avgScore * 1000) / 1000,
    confidence: Math.round(avgConfidence * 1000) / 1000,
  };
}

function parseAlphaVantageDate(raw: string): string {
  const y = raw.slice(0, 4);
  const m = raw.slice(4, 6);
  const d = raw.slice(6, 8);
  const h = raw.slice(9, 11);
  const min = raw.slice(11, 13);
  const s = raw.slice(13, 15);
  return `${y}-${m}-${d}T${h}:${min}:${s}Z`;
}

const SEC_TICKERS_URL = 'https://www.sec.gov/files/company_tickers_exchange.json';
const VALID_US_EXCHANGES = new Set(['NYSE', 'Nasdaq']);
const LISTING_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const ECSE_LISTINGS: ListedStock[] = [
  { ticker: 'BON', name: 'The Bank of Nevis Ltd', exchange: 'ECSE' },
  { ticker: 'BOSV', name: 'Bank of St Vincent and the Grenadines', exchange: 'ECSE' },
  { ticker: 'CWKN', name: 'Cable & Wireless St. Kitts & Nevis', exchange: 'ECSE' },
  { ticker: 'DES', name: 'Dominica Electricity Services Ltd', exchange: 'ECSE' },
  { ticker: 'ECFH', name: 'East Caribbean Financial Holding Co. Ltd', exchange: 'ECSE' },
  { ticker: 'GCBL', name: 'Grenada Co-operative Bank Limited', exchange: 'ECSE' },
  { ticker: 'GESL', name: 'Grenada Electricity Services Limited', exchange: 'ECSE' },
  { ticker: 'GPCL', name: 'Grenreal Property Corporation Limited', exchange: 'ECSE' },
  { ticker: 'RBGL', name: 'Republic Bank (Grenada) Limited', exchange: 'ECSE' },
  { ticker: 'SKNB', name: 'St. Kitts Nevis Anguilla National Bank Ltd', exchange: 'ECSE' },
  { ticker: 'SLES', name: 'St. Lucia Electricity Services Ltd', exchange: 'ECSE' },
  { ticker: 'SLH', name: 'S. L. Horsford and Company Ltd', exchange: 'ECSE' },
  { ticker: 'TDC', name: 'St Kitts Nevis Anguilla Trading and Development Company Ltd', exchange: 'ECSE' },
  { ticker: 'WIOC', name: 'West Indies Oil Company Limited', exchange: 'ECSE' },
];

let listingCache: { data: ListedStock[]; fetchedAt: number } | null = null;

export async function fetchActiveListings(): Promise<ListedStock[]> {
  if (listingCache && Date.now() - listingCache.fetchedAt < LISTING_CACHE_TTL_MS) {
    return listingCache.data;
  }

  const res = await fetch(SEC_TICKERS_URL, {
    headers: { 'User-Agent': 's2-stock-app admin@daulric.dev', Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`SEC EDGAR returned ${res.status}`);
  }

  const json: {
    fields: string[];
    data: [number, string, string, string][];
  } = await res.json();

  if (!json.data || !Array.isArray(json.data)) {
    throw new Error('Unexpected response format from SEC EDGAR');
  }

  const stocks: ListedStock[] = [];

  for (const [, name, ticker, exchange] of json.data) {
    if (!VALID_US_EXCHANGES.has(exchange) || !ticker || !name) continue;
    if (ticker.includes('.') || ticker.includes('-') || ticker.includes('/')) continue;
    stocks.push({ ticker, name, exchange });
  }

  stocks.push(...ECSE_LISTINGS);

  try {
    const euStocks = await fetchEuListings();
    stocks.push(...euStocks);
  } catch (e) {
    console.error('Failed to fetch EU listings from Wikipedia:', e);
  }

  listingCache = { data: stocks, fetchedAt: Date.now() };
  return stocks;
}
