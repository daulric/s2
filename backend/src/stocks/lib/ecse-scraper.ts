const ECSE_URL = 'https://www.ecseonline.com/';

export type EcseQuote = {
  ticker: string;
  price: number;
  change: number;
};

const ECSE_TICKERS = new Set([
  'BON', 'BOSV', 'CWKN', 'DES', 'ECFH', 'GCBL', 'GESL',
  'GPCL', 'RBGL', 'SKNB', 'SLES', 'SLH', 'TDC', 'WIOC',
]);

export function isEcseTicker(ticker: string): boolean {
  return ECSE_TICKERS.has(ticker.toUpperCase());
}

export async function scrapeEcseQuotes(): Promise<EcseQuote[]> {
  const res = await fetch(ECSE_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; S2StockApp/1.0; +https://rodrigo.co)',
    },
  });
  if (!res.ok) return [];

  const html = await res.text();
  return parseEcseQuotesFromHtml(html);
}

export function parseEcseQuotesFromHtml(html: string): EcseQuote[] {
  const quotes: EcseQuote[] = [];

  const priceBlockPattern =
    /\/profiles\/([A-Z]+)\/[^>]*>\s*<strong>([\d.]+)<\/strong>\s*<small>\([^$]*\$([\d.]+)\)<\/small>/gi;

  let match: RegExpExecArray | null;
  while ((match = priceBlockPattern.exec(html)) !== null) {
    const ticker = match[1]!.toUpperCase();
    const price = parseFloat(match[2]!);
    const change = parseFloat(match[3]!);
    if (!ECSE_TICKERS.has(ticker) || !Number.isFinite(price)) continue;
    quotes.push({ ticker, price, change });
  }

  const seen = new Map<string, EcseQuote>();
  for (const q of quotes) {
    if (!seen.has(q.ticker)) seen.set(q.ticker, q);
  }
  return [...seen.values()];
}
