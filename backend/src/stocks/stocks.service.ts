import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import {
  fetchActiveListings,
  fetchFinnhubQuote,
  fetchYahooQuote,
  fetchAlphaVantageNewsSentiment,
  fetchFinnhubCompanyNews,
  computePrediction,
} from './lib/api';
import { isEuTicker } from './lib/eu-listings';
import { isEcseTicker, scrapeEcseQuotes } from './lib/ecse-scraper';
import { persistFinnhubArticlesIfNew } from './lib/persist-stock-articles';
import { backfillArticleSentimentsForTickers } from './lib/backfill-article-sentiments';

const PRICE_BATCH_SIZE = 50;
const YAHOO_BATCH_SIZE = 10;
const PRICE_BATCH_DELAY_MS = 1_200;
const YAHOO_BATCH_DELAY_MS = 600;
const UPSERT_CHUNK_SIZE = 500;
const INGEST_BATCH_SIZE = 5;
const INGEST_BATCH_DELAY_MS = 15_000;

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

  /**
   * Seed stocks from SEC EDGAR + ECSE + EU listings.
   * Upserts all listings, then prices a batch via Finnhub (US) and Yahoo (EU/ECSE).
   */
  async seed(): Promise<{ message: string }> {
    const client = this.supabase.getClient();

    this.logger.log('Seed: fetching active listings...');
    const listings = await fetchActiveListings();
    if (listings.length === 0) {
      return { message: 'No listings returned from SEC EDGAR' };
    }

    const rows = listings.map((s) => ({
      ticker: s.ticker,
      name: s.name,
      exchange: s.exchange,
      sector: null,
      updated_at: new Date().toISOString(),
    }));

    for (let i = 0; i < rows.length; i += UPSERT_CHUNK_SIZE) {
      const chunk = rows.slice(i, i + UPSERT_CHUNK_SIZE);
      const { error } = await client.from('stocks').upsert(chunk, { onConflict: 'ticker' });
      if (error) {
        return { message: `Upsert error at offset ${i}: ${error.message}` };
      }
    }

    let usPriced = 0;
    if (this.finnhubKey) {
      const usBatch = listings
        .filter((s) => !isEuTicker(s.ticker) && !isEcseTicker(s.ticker))
        .slice(0, PRICE_BATCH_SIZE);

      for (const stock of usBatch) {
        try {
          const quote = await fetchFinnhubQuote(stock.ticker, this.finnhubKey);
          if (quote) {
            await client
              .from('stocks')
              .update({
                last_price: quote.price,
                price_change_pct: quote.changePct,
                updated_at: new Date().toISOString(),
              })
              .eq('ticker', stock.ticker);
            usPriced++;
          }
        } catch {
          // continue
        }
        await this.delay(PRICE_BATCH_DELAY_MS);
      }
    }

    let nonUsPriced = 0;
    const nonUsListings = listings.filter(
      (s) => isEuTicker(s.ticker) || isEcseTicker(s.ticker),
    );
    for (let i = 0; i < nonUsListings.length; i += YAHOO_BATCH_SIZE) {
      const batch = nonUsListings.slice(i, i + YAHOO_BATCH_SIZE);
      await Promise.all(
        batch.map(async (stock) => {
          try {
            const quote = await fetchYahooQuote(stock.ticker);
            if (quote) {
              await client
                .from('stocks')
                .update({
                  last_price: quote.price,
                  price_change_pct: quote.changePct,
                  updated_at: new Date().toISOString(),
                })
                .eq('ticker', stock.ticker);
              nonUsPriced++;
            }
          } catch {
            // continue
          }
        }),
      );
      if (i + YAHOO_BATCH_SIZE < nonUsListings.length) {
        await this.delay(YAHOO_BATCH_DELAY_MS);
      }
    }

    return {
      message: `Seeded ${listings.length} stocks, priced ${usPriced} US + ${nonUsPriced} EU/ECSE`,
    };
  }

  /**
   * Full ingestion: prices, news, sentiments, and predictions.
   * Uses Yahoo for EU/ECSE, Finnhub for US. Fetches Alpha Vantage + Finnhub news,
   * backfills sentiments, and computes predictions.
   */
  async ingest(): Promise<{
    message: string;
    results: { ticker: string; status: string }[];
    timestamp: string;
  }> {
    if (!this.alphaKey || !this.finnhubKey) {
      throw new Error('Missing ALPHAVANTAGE_API_KEY or FINNHUB_API_KEY');
    }

    const client = this.supabase.getClient();
    const { data: stockRows, error: stocksError } = await client
      .from('stocks')
      .select('ticker');

    if (stocksError || !stockRows || stockRows.length === 0) {
      throw new Error(
        stocksError?.message ?? 'No stocks in database. Run /stocks/seed first.',
      );
    }

    const allTickers = stockRows.map((r: { ticker: string }) => r.ticker);
    const results: { ticker: string; status: string }[] = [];

    for (let i = 0; i < allTickers.length; i += INGEST_BATCH_SIZE) {
      const batch = allTickers.slice(i, i + INGEST_BATCH_SIZE);

      for (const ticker of batch) {
        try {
          const nonUs = isEuTicker(ticker) || isEcseTicker(ticker);
          const quote = nonUs
            ? await fetchYahooQuote(ticker)
            : await fetchFinnhubQuote(ticker, this.finnhubKey);
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
        const { articles, sentiments } = await fetchAlphaVantageNewsSentiment(
          batch,
          this.alphaKey,
        );

        for (const article of articles) {
          const { data: existing } = await client
            .from('stock_articles')
            .select('id')
            .eq('ticker', article.ticker)
            .eq('headline', article.headline)
            .single();

          if (existing) continue;

          const { data: inserted } = await client
            .from('stock_articles')
            .insert(article)
            .select('id')
            .single();

          if (!inserted) continue;

          const matchingSentiment = sentiments.find(
            (s) => s.ticker === article.ticker && s.headline === article.headline,
          );
          if (matchingSentiment) {
            await client.from('article_sentiments').insert({
              article_id: inserted.id,
              ticker: matchingSentiment.ticker,
              sentiment_score: matchingSentiment.score,
              sentiment_label: matchingSentiment.label,
              confidence: matchingSentiment.confidence,
              model_used: 'alphavantage',
            });
          }
        }

        for (const ticker of batch) {
          try {
            const finnhubNews = await fetchFinnhubCompanyNews(
              ticker,
              this.finnhubKey,
              7,
            );
            await persistFinnhubArticlesIfNew(client, ticker.toUpperCase(), finnhubNews);
          } catch {
            // Finnhub or persist failed for this ticker
          }
        }

        await backfillArticleSentimentsForTickers(
          client,
          batch.map((t) => t.toUpperCase()),
          this.alphaKey,
        );

        for (const ticker of batch) {
          const { data: recentSentiments } = await client
            .from('article_sentiments')
            .select('sentiment_score, confidence')
            .eq('ticker', ticker)
            .order('created_at', { ascending: false })
            .limit(50);

          const items = (recentSentiments ?? []).map(
            (s: { sentiment_score: number; confidence: number }) => ({
              score: s.sentiment_score,
              confidence: s.confidence,
            }),
          );

          const prediction = computePrediction(items);

          await client.from('stock_predictions').insert({
            ticker,
            direction: prediction.direction,
            score: prediction.score,
            confidence: prediction.confidence,
            article_count: items.length,
            timeframe: '24h',
          });

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

      if (i + INGEST_BATCH_SIZE < allTickers.length) {
        await this.delay(INGEST_BATCH_DELAY_MS);
      }
    }

    return {
      message: `Ingested ${results.filter((r) => r.status === 'ok').length}/${allTickers.length} stocks`,
      results,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Snapshot ECSE quotes by scraping the exchange website directly.
   */
  async ecseSnapshot(): Promise<{ message: string; quotes?: { ticker: string; price: number; change: number }[] }> {
    const quotes = await scrapeEcseQuotes();
    if (quotes.length === 0) {
      return { message: 'Failed to scrape ECSE quotes — site may be down' };
    }

    const client = this.supabase.getClient();
    const now = new Date().toISOString();

    const updates = quotes.map((q) =>
      client
        .from('stocks')
        .update({
          last_price: q.price,
          price_change_pct: q.price !== 0 ? (q.change / q.price) * 100 : 0,
          updated_at: now,
        })
        .eq('ticker', q.ticker),
    );
    await Promise.all(updates);

    return {
      message: `Updated ${quotes.length} ECSE stock prices`,
      quotes,
    };
  }

  /**
   * Migrate/update exchange field using multi-exchange active listings.
   */
  async migrateExchange(): Promise<{ message: string }> {
    const client = this.supabase.getClient();

    const listings = await fetchActiveListings();
    if (listings.length === 0) {
      return { message: 'No listings fetched' };
    }

    const rows = listings.map((s) => ({
      ticker: s.ticker,
      name: s.name,
      exchange: s.exchange,
      sector: null as string | null,
      updated_at: new Date().toISOString(),
    }));

    let upserted = 0;
    for (let i = 0; i < rows.length; i += UPSERT_CHUNK_SIZE) {
      const chunk = rows.slice(i, i + UPSERT_CHUNK_SIZE);
      const { error } = await client
        .from('stocks')
        .upsert(chunk, { onConflict: 'ticker' });

      if (error) {
        return { message: `Error at offset ${i}: ${error.message}` };
      }
      upserted += chunk.length;
    }

    const ecseCount = listings.filter((l) => l.exchange === 'ECSE').length;
    return {
      message: `Upserted ${upserted} stocks (${ecseCount} ECSE) with exchange field`,
    };
  }

  /**
   * Fetch fresh prices for the given tickers (or all stocks) and persist them.
   * Returns the list of successfully updated tickers with their new prices.
   */
  async fetchAndPersistPrices(
    tickers?: string[],
  ): Promise<{ ticker: string; price: number; changePct: number }[]> {
    const client = this.supabase.getClient();

    let tickerList: string[];
    if (tickers && tickers.length > 0) {
      tickerList = tickers.map((t) => t.toUpperCase());
    } else {
      const { data: rows } = await client.from('stocks').select('ticker');
      tickerList = (rows ?? []).map((r: { ticker: string }) => r.ticker);
    }

    const updates: { ticker: string; price: number; changePct: number }[] = [];

    for (const ticker of tickerList) {
      try {
        const nonUs = isEuTicker(ticker) || isEcseTicker(ticker);
        const quote = nonUs
          ? await fetchYahooQuote(ticker)
          : await fetchFinnhubQuote(ticker, this.finnhubKey);

        if (quote) {
          await client
            .from('stocks')
            .update({
              last_price: quote.price,
              price_change_pct: quote.changePct,
              updated_at: new Date().toISOString(),
            })
            .eq('ticker', ticker);

          updates.push({ ticker, price: quote.price, changePct: quote.changePct });
        }
      } catch {
        // skip failed ticker
      }
    }

    return updates;
  }
}
