import type { SupabaseClient } from '@supabase/supabase-js';
import type { StockArticle } from './types';

export async function persistFinnhubArticlesIfNew(
  supabase: SupabaseClient<any, string>,
  tickerUpper: string,
  articles: Omit<StockArticle, 'id' | 'created_at'>[],
): Promise<number> {
  let inserted = 0;
  for (const raw of articles) {
    const row = { ...raw, ticker: tickerUpper };
    const { data: existing } = await supabase
      .from('stock_articles')
      .select('id')
      .eq('ticker', row.ticker)
      .eq('headline', row.headline)
      .maybeSingle();

    if (existing) continue;

    const { error } = await supabase.from('stock_articles').insert({
      ticker: row.ticker,
      source: row.source,
      headline: row.headline,
      summary: row.summary,
      url: row.url,
      image_url: row.image_url,
      published_at: row.published_at,
    });

    if (!error) inserted += 1;
  }
  return inserted;
}
