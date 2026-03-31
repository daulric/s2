export type StockExchange = 'NYSE' | 'Nasdaq' | 'ECSE' | 'EU';

export type Stock = {
  ticker: string;
  name: string;
  exchange: StockExchange | null;
  sector: string | null;
  last_price: number | null;
  price_change_pct: number | null;
  volume: number | null;
  market_cap: number | null;
  updated_at: string;
};

export type StockArticle = {
  id: string;
  ticker: string;
  source: string;
  headline: string;
  summary: string | null;
  url: string | null;
  image_url: string | null;
  published_at: string;
  created_at: string;
};

export type ListedStock = {
  ticker: string;
  name: string;
  exchange: string;
};

export type PriceCandle = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};
