import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class StocksService {
  private readonly logger = new Logger(StocksService.name);
  private readonly finnhubKey: string;
  private readonly alphaKey: string;
  private readonly cronSecret: string;

  constructor(
    private config: ConfigService,
    private supabase: SupabaseService,
  ) {
    this.finnhubKey = this.config.get('FINNHUB_API_KEY') ?? '';
    this.alphaKey = this.config.get('ALPHAVANTAGE_API_KEY') ?? '';
    this.cronSecret = this.config.get('CRON_SECRET') ?? '';
  }

  getCronSecret(): string {
    return this.cronSecret;
  }

  getFinnhubKey(): string {
    return this.finnhubKey;
  }

  getAlphaKey(): string {
    return this.alphaKey;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async fetchFinnhubQuote(ticker: string): Promise<{ price: number; changePct: number } | null> {
    if (!this.finnhubKey) return null;
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${this.finnhubKey}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    if (!data.c || data.c === 0) return null;
    return {
      price: data.c,
      changePct: data.dp ?? 0,
    };
  }

  async fetchYahooQuote(ticker: string): Promise<{ price: number; changePct: number } | null> {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1d&interval=1d`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (!res.ok) return null;
      const json = await res.json();
      const meta = json?.chart?.result?.[0]?.meta;
      if (!meta?.regularMarketPrice) return null;
      const price = meta.regularMarketPrice;
      const prevClose = meta.previousClose ?? meta.chartPreviousClose ?? price;
      const changePct = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;
      return { price, changePct };
    } catch {
      return null;
    }
  }

  /**
   * Seed stocks from SEC EDGAR active listings.
   * Fetches the full listing, upserts into stocks table, then prices a batch via Finnhub/Yahoo.
   */
  async seed(): Promise<{ message: string }> {
    const client = this.supabase.getClient();

    const edgarRes = await fetch(
      'https://efts.sec.gov/LATEST/search-index?q=%2A&dateRange=custom&startdt=2020-01-01&forms=10-K,10-Q&from=0&size=0',
    ).catch(() => null);

    if (!edgarRes) {
      return { message: 'Failed to reach SEC EDGAR' };
    }

    this.logger.log('Seed: fetching active tickers from SEC EDGAR...');

    const companiesRes = await fetch(
      'https://www.sec.gov/files/company_tickers.json',
      { headers: { 'User-Agent': 's2-backend/1.0' } },
    );

    if (!companiesRes.ok) {
      return { message: `SEC EDGAR fetch failed (${companiesRes.status})` };
    }

    const companies = await companiesRes.json();
    const listings: { ticker: string; name: string; exchange: string }[] = [];
    for (const key of Object.keys(companies)) {
      const c = companies[key];
      listings.push({
        ticker: c.ticker,
        name: c.title,
        exchange: 'US',
      });
    }

    if (listings.length === 0) {
      return { message: 'No listings returned from SEC EDGAR' };
    }

    const CHUNK = 500;
    for (let i = 0; i < listings.length; i += CHUNK) {
      const chunk = listings.slice(i, i + CHUNK).map((s) => ({
        ticker: s.ticker,
        name: s.name,
        exchange: s.exchange,
        sector: null,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await client
        .from('stocks')
        .upsert(chunk, { onConflict: 'ticker' });

      if (error) {
        return { message: `Upsert error at offset ${i}: ${error.message}` };
      }
    }

    let priced = 0;
    const priceBatch = listings.slice(0, 50);
    for (const stock of priceBatch) {
      const quote = await this.fetchFinnhubQuote(stock.ticker);
      if (quote) {
        await client
          .from('stocks')
          .update({
            last_price: quote.price,
            price_change_pct: quote.changePct,
            updated_at: new Date().toISOString(),
          })
          .eq('ticker', stock.ticker);
        priced++;
      }
      await this.delay(1200);
    }

    return { message: `Seeded ${listings.length} stocks, priced ${priced}` };
  }

  /**
   * Main ingestion loop: updates prices, fetches news, computes predictions.
   */
  async ingest(): Promise<{ message: string; results: { ticker: string; status: string }[] }> {
    if (!this.alphaKey || !this.finnhubKey) {
      throw new Error('Missing ALPHAVANTAGE_API_KEY or FINNHUB_API_KEY');
    }

    const client = this.supabase.getClient();
    const { data: stockRows } = await client.from('stocks').select('ticker');

    if (!stockRows || stockRows.length === 0) {
      throw new Error('No stocks in database. Run /stocks/seed first.');
    }

    const allTickers = stockRows.map((r: { ticker: string }) => r.ticker);
    const results: { ticker: string; status: string }[] = [];
    const BATCH = 5;
    const BATCH_DELAY = 15_000;

    for (let i = 0; i < allTickers.length; i += BATCH) {
      const batch = allTickers.slice(i, i + BATCH);

      for (const ticker of batch) {
        try {
          const quote = await this.fetchFinnhubQuote(ticker);
          if (quote) {
            await client
              .from('stocks')
              .update({
                last_price: quote.price,
                price_change_pct: quote.changePct,
                updated_at: new Date().toISOString(),
              })
              .eq('ticker', ticker);
          }
        } catch {
          // price fetch failed, continue
        }
      }

      try {
        for (const ticker of batch) {
          const { data: sentiments } = await client
            .from('article_sentiments')
            .select('sentiment_score, confidence')
            .eq('ticker', ticker)
            .order('created_at', { ascending: false })
            .limit(50);

          const items = (sentiments ?? []).map(
            (s: { sentiment_score: number; confidence: number }) => ({
              score: s.sentiment_score,
              confidence: s.confidence,
            }),
          );

          if (items.length > 0) {
            const totalWeight = items.reduce(
              (sum: number, it: { score: number; confidence: number }) => sum + it.confidence,
              0,
            );
            const weightedScore =
              totalWeight > 0
                ? items.reduce(
                    (sum: number, it: { score: number; confidence: number }) =>
                      sum + it.score * it.confidence,
                    0,
                  ) / totalWeight
                : 0;

            const direction = weightedScore > 0.1 ? 'up' : weightedScore < -0.1 ? 'down' : 'neutral';

            await client.from('stock_predictions').insert({
              ticker,
              direction,
              score: weightedScore,
              confidence: totalWeight > 0 ? totalWeight / items.length : 0,
              article_count: items.length,
              timeframe: '24h',
            });
          }

          results.push({ ticker, status: 'ok' });
        }
      } catch (err) {
        for (const ticker of batch) {
          results.push({
            ticker,
            status: `error: ${err instanceof Error ? err.message : 'unknown'}`,
          });
        }
      }

      if (i + BATCH < allTickers.length) {
        await this.delay(BATCH_DELAY);
      }
    }

    return {
      message: `Ingested ${results.filter((r) => r.status === 'ok').length}/${allTickers.length} stocks`,
      results,
    };
  }

  /**
   * Snapshot ECSE quotes by scraping the exchange website.
   * This is a simplified version — the actual scraper is in the frontend lib.
   */
  async ecseSnapshot(): Promise<{ message: string }> {
    const client = this.supabase.getClient();
    const { data: ecseStocks } = await client
      .from('stocks')
      .select('ticker')
      .eq('exchange', 'ECSE');

    if (!ecseStocks || ecseStocks.length === 0) {
      return { message: 'No ECSE stocks found' };
    }

    let updated = 0;
    for (const stock of ecseStocks) {
      const quote = await this.fetchYahooQuote(stock.ticker);
      if (quote) {
        await client
          .from('stocks')
          .update({
            last_price: quote.price,
            price_change_pct: quote.changePct,
            updated_at: new Date().toISOString(),
          })
          .eq('ticker', stock.ticker);
        updated++;
      }
    }

    return { message: `Updated ${updated} ECSE stock prices` };
  }

  /**
   * Migrate/update exchange field from SEC EDGAR listings.
   */
  async migrateExchange(): Promise<{ message: string }> {
    const client = this.supabase.getClient();

    const companiesRes = await fetch(
      'https://www.sec.gov/files/company_tickers.json',
      { headers: { 'User-Agent': 's2-backend/1.0' } },
    );

    if (!companiesRes.ok) {
      return { message: `SEC EDGAR fetch failed (${companiesRes.status})` };
    }

    const companies = await companiesRes.json();
    const listings: { ticker: string; name: string; exchange: string }[] = [];
    for (const key of Object.keys(companies)) {
      const c = companies[key];
      listings.push({ ticker: c.ticker, name: c.title, exchange: 'US' });
    }

    const CHUNK = 500;
    let upserted = 0;
    for (let i = 0; i < listings.length; i += CHUNK) {
      const chunk = listings.slice(i, i + CHUNK).map((s) => ({
        ticker: s.ticker,
        name: s.name,
        exchange: s.exchange,
        sector: null as string | null,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await client
        .from('stocks')
        .upsert(chunk, { onConflict: 'ticker' });

      if (error) {
        return { message: `Error at offset ${i}: ${error.message}` };
      }
      upserted += chunk.length;
    }

    return { message: `Upserted ${upserted} stocks with exchange field` };
  }
}
