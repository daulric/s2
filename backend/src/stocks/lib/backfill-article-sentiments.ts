import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchAlphaVantageNewsSentiment } from './api';

type SentPayload = {
  score: number;
  label: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
};

function normalizeHeadline(h: string): string {
  return h.trim().replace(/\s+/g, ' ').toLowerCase();
}

function toSentimentLabel(label: string): 'bullish' | 'bearish' | 'neutral' {
  if (label === 'bullish' || label === 'bearish' || label === 'neutral') return label;
  return 'neutral';
}

function buildAlphaLookups(
  tickersUpper: Set<string>,
  avArticles: { ticker: string; headline: string; url: string | null }[],
  sentiments: { headline: string; ticker: string; score: number; label: string; confidence: number }[],
): Map<string, { byHeadline: Map<string, SentPayload>; byUrl: Map<string, SentPayload> }> {
  const lookups = new Map<
    string,
    { byHeadline: Map<string, SentPayload>; byUrl: Map<string, SentPayload> }
  >();

  for (let i = 0; i < sentiments.length; i++) {
    const s = sentiments[i]!;
    const a = avArticles[i]!;
    const t = a.ticker.toUpperCase();
    if (!tickersUpper.has(t)) continue;

    let L = lookups.get(t);
    if (!L) {
      L = { byHeadline: new Map(), byUrl: new Map() };
      lookups.set(t, L);
    }

    const payload: SentPayload = {
      score: s.score,
      label: toSentimentLabel(s.label),
      confidence: Math.max(0.05, Math.min(1, s.confidence)),
    };

    const hk = normalizeHeadline(a.headline);
    if (!L.byHeadline.has(hk)) L.byHeadline.set(hk, payload);

    const url = a.url?.trim().toLowerCase();
    if (url && !L.byUrl.has(url)) L.byUrl.set(url, payload);
  }

  return lookups;
}

async function tickerHasUnscoredArticles(
  supabase: SupabaseClient<any, string>,
  tickerUpper: string,
): Promise<boolean> {
  const { data: rows } = await supabase
    .from('stock_articles')
    .select('id')
    .eq('ticker', tickerUpper);
  if (!rows?.length) return false;

  const { data: scored } = await supabase
    .from('article_sentiments')
    .select('article_id')
    .eq('ticker', tickerUpper);

  const scoredSet = new Set((scored ?? []).map((r) => r.article_id));
  return rows.some((r) => !scoredSet.has(r.id));
}

async function scoreUnscoredArticlesForTicker(
  supabase: SupabaseClient<any, string>,
  tickerUpper: string,
  lookup:
    | { byHeadline: Map<string, SentPayload>; byUrl: Map<string, SentPayload> }
    | undefined,
): Promise<{ alphaMatches: number; neutralFallback: number }> {
  const { data: scoredRows } = await supabase
    .from('article_sentiments')
    .select('article_id')
    .eq('ticker', tickerUpper);

  const scoredSet = new Set((scoredRows ?? []).map((r) => r.article_id));

  const { data: stockArticles } = await supabase
    .from('stock_articles')
    .select('id, headline, url')
    .eq('ticker', tickerUpper);

  let alphaMatches = 0;
  const L = lookup ?? {
    byHeadline: new Map<string, SentPayload>(),
    byUrl: new Map<string, SentPayload>(),
  };

  const alphaBatch: {
    article_id: string;
    ticker: string;
    sentiment_score: number;
    sentiment_label: 'bullish' | 'bearish' | 'neutral';
    confidence: number;
    model_used: string;
  }[] = [];

  for (const art of stockArticles ?? []) {
    if (scoredSet.has(art.id)) continue;

    const fromUrl = art.url?.trim().toLowerCase();
    const match =
      (fromUrl ? L.byUrl.get(fromUrl) : undefined) ??
      L.byHeadline.get(normalizeHeadline(art.headline));

    if (match) {
      alphaBatch.push({
        article_id: art.id,
        ticker: tickerUpper,
        sentiment_score: match.score,
        sentiment_label: match.label,
        confidence: match.confidence,
        model_used: 'alphavantage',
      });
    }
  }

  const INSERT_BATCH = 40;
  for (let i = 0; i < alphaBatch.length; i += INSERT_BATCH) {
    const slice = alphaBatch.slice(i, i + INSERT_BATCH);
    const { error } = await supabase.from('article_sentiments').insert(slice);
    if (!error) {
      alphaMatches += slice.length;
      for (const row of slice) scoredSet.add(row.article_id);
    }
  }

  const neutralBatch: typeof alphaBatch = [];
  for (const art of stockArticles ?? []) {
    if (scoredSet.has(art.id)) continue;
    neutralBatch.push({
      article_id: art.id,
      ticker: tickerUpper,
      sentiment_score: 0,
      sentiment_label: 'neutral',
      confidence: 0.25,
      model_used: 'fallback_neutral',
    });
  }

  let neutralFallback = 0;
  for (let i = 0; i < neutralBatch.length; i += INSERT_BATCH) {
    const slice = neutralBatch.slice(i, i + INSERT_BATCH);
    const { error } = await supabase.from('article_sentiments').insert(slice);
    if (!error) neutralFallback += slice.length;
  }

  return { alphaMatches, neutralFallback };
}

export async function backfillArticleSentimentsForTickers(
  supabase: SupabaseClient<any, string>,
  tickersUpper: string[],
  alphaKey: string | undefined,
): Promise<void> {
  if (tickersUpper.length === 0) return;

  const set = new Set(tickersUpper.map((t) => t.toUpperCase()));
  const targets: string[] = [];
  for (const t of set) {
    if (await tickerHasUnscoredArticles(supabase, t)) targets.push(t);
  }
  if (targets.length === 0) return;

  const targetSet = new Set(targets);
  let lookups = new Map<
    string,
    { byHeadline: Map<string, SentPayload>; byUrl: Map<string, SentPayload> }
  >();

  if (alphaKey) {
    try {
      const { articles: avArticles, sentiments } = await fetchAlphaVantageNewsSentiment(
        targets,
        alphaKey,
      );
      lookups = buildAlphaLookups(targetSet, avArticles, sentiments);
    } catch {
      lookups = new Map();
    }
  }

  for (const t of targets) {
    await scoreUnscoredArticlesForTicker(supabase, t, lookups.get(t));
  }
}
