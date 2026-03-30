-- Stock Prediction Service Schema
-- Run this in your Supabase SQL Editor

set search_path to "meetup-app";

create table if not exists stocks (
  ticker text primary key,
  name text not null,
  exchange text,
  sector text,
  last_price numeric,
  price_change_pct numeric,
  volume bigint,
  market_cap numeric,
  updated_at timestamptz default now()
);

create index if not exists idx_stocks_exchange on stocks(exchange);

create table if not exists stock_articles (
  id uuid primary key default gen_random_uuid(),
  ticker text not null references stocks(ticker) on delete cascade,
  source text not null,
  headline text not null,
  summary text,
  url text,
  image_url text,
  published_at timestamptz not null,
  created_at timestamptz default now()
);

create index if not exists idx_stock_articles_ticker on stock_articles(ticker);
create index if not exists idx_stock_articles_published on stock_articles(published_at desc);

create table if not exists article_sentiments (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references stock_articles(id) on delete cascade,
  ticker text not null references stocks(ticker) on delete cascade,
  sentiment_score numeric not null check (sentiment_score >= -1 and sentiment_score <= 1),
  sentiment_label text not null check (sentiment_label in ('bullish', 'bearish', 'neutral')),
  confidence numeric not null check (confidence >= 0 and confidence <= 1),
  model_used text default 'alphavantage',
  created_at timestamptz default now()
);

create index if not exists idx_article_sentiments_ticker on article_sentiments(ticker);

create table if not exists stock_predictions (
  id uuid primary key default gen_random_uuid(),
  ticker text not null references stocks(ticker) on delete cascade,
  direction text not null check (direction in ('bullish', 'bearish', 'neutral')),
  score numeric not null check (score >= -1 and score <= 1),
  confidence numeric not null check (confidence >= 0 and confidence <= 1),
  article_count int not null default 0,
  timeframe text not null default '24h',
  created_at timestamptz default now()
);

create index if not exists idx_stock_predictions_ticker on stock_predictions(ticker);
create index if not exists idx_stock_predictions_created on stock_predictions(created_at desc);

create table if not exists user_watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  ticker text not null references stocks(ticker) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, ticker)
);

create index if not exists idx_user_watchlists_user on user_watchlists(user_id);

-- Enable RLS
alter table stocks enable row level security;
alter table stock_articles enable row level security;
alter table article_sentiments enable row level security;
alter table stock_predictions enable row level security;
alter table user_watchlists enable row level security;

-- Public read for stocks, articles, sentiments, predictions
do $$ begin
  create policy "Public read stocks" on stocks for select using (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "Public read articles" on stock_articles for select using (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "Public read sentiments" on article_sentiments for select using (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "Public read predictions" on stock_predictions for select using (true);
exception when duplicate_object then null;
end $$;

-- Service role write (for ingestion cron)
do $$ begin
  create policy "Service insert stocks" on stocks for insert with check (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "Service update stocks" on stocks for update using (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "Service insert articles" on stock_articles for insert with check (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "Service insert sentiments" on article_sentiments for insert with check (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "Service insert predictions" on stock_predictions for insert with check (true);
exception when duplicate_object then null;
end $$;

-- Watchlists: users manage their own
do $$ begin
  create policy "Users read own watchlist" on user_watchlists for select using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "Users insert own watchlist" on user_watchlists for insert with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "Users delete own watchlist" on user_watchlists for delete using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;
