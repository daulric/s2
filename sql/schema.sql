
set search_path to "meetup-app-staging";

-- =====================
-- User Profiles
-- =====================

create table if not exists profiles (
  id uuid primary key,
  username text not null,
  avatar_url text,
  description text,
  is_verified boolean default false,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz default now()
);

create index if not exists idx_profiles_username on profiles(username);

-- =====================
-- Videos
-- =====================

create table if not exists videos (
  video_id uuid primary key default gen_random_uuid(),
  userid uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  video_path text not null,
  thumbnail_path text,
  visibility text not null default 'public' check (visibility in ('public', 'private', 'unlisted')),
  category text,
  views bigint default 0,
  is_short boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_videos_userid on videos(userid);
create index if not exists idx_videos_visibility on videos(visibility);
create index if not exists idx_videos_created on videos(created_at desc);

-- =====================
-- Video Likes
-- =====================

create table if not exists video_likes (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references videos(video_id) on delete cascade,
  userid uuid not null references profiles(id) on delete cascade,
  is_liked boolean,
  created_at timestamptz default now(),
  unique(userid, video_id)
);

create index if not exists idx_video_likes_video on video_likes(video_id);
create index if not exists idx_video_likes_user on video_likes(userid);

-- =====================
-- Subscribers (channel subscriptions)
-- =====================

create table if not exists subscribers (
  id uuid primary key default gen_random_uuid(),
  vendor uuid not null references profiles(id) on delete cascade,
  subscriber uuid not null references profiles(id) on delete cascade,
  is_subscribed boolean default false,
  created_at timestamptz default now(),
  unique(vendor, subscriber)
);

create index if not exists idx_subscribers_vendor on subscribers(vendor);
create index if not exists idx_subscribers_subscriber on subscribers(subscriber);

-- =====================
-- Audios (Music)
-- =====================

create table if not exists audios (
  audio_id uuid primary key default gen_random_uuid(),
  userid uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  audio_path text not null,
  thumbnail_path text,
  visibility text not null default 'public' check (visibility in ('public', 'private', 'unlisted')),
  listens bigint default 0,
  created_at timestamptz default now()
);

create index if not exists idx_audios_userid on audios(userid);
create index if not exists idx_audios_visibility on audios(visibility);
create index if not exists idx_audios_created on audios(created_at desc);

-- =====================
-- Stocks
-- =====================

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

-- =====================
-- Enable RLS
-- =====================

alter table profiles enable row level security;
alter table videos enable row level security;
alter table video_likes enable row level security;
alter table subscribers enable row level security;
alter table audios enable row level security;
alter table stocks enable row level security;
alter table stock_articles enable row level security;
alter table article_sentiments enable row level security;
alter table stock_predictions enable row level security;
alter table user_watchlists enable row level security;

-- =====================
-- Profiles policies
-- =====================

do $$ begin
  create policy "Public read profiles" on profiles for select using (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "Users insert own profile" on profiles for insert with check (auth.uid() = id);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "Users update own profile" on profiles for update using (auth.uid() = id);
exception when duplicate_object then null;
end $$;

-- =====================
-- Videos policies
-- =====================

do $$ begin
  create policy "Public read public videos" on videos for select using (visibility = 'public' or auth.uid() = userid);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "Users insert own videos" on videos for insert with check (auth.uid() = userid);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "Users update own videos" on videos for update using (auth.uid() = userid);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "Users delete own videos" on videos for delete using (auth.uid() = userid);
exception when duplicate_object then null;
end $$;

-- =====================
-- Video likes policies
-- =====================

do $$ begin
  create policy "Public read video likes" on video_likes for select using (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "Users manage own likes" on video_likes for insert with check (auth.uid() = userid);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "Users update own likes" on video_likes for update using (auth.uid() = userid);
exception when duplicate_object then null;
end $$;

-- =====================
-- Subscribers policies
-- =====================

do $$ begin
  create policy "Public read subscribers" on subscribers for select using (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "Users manage own subscriptions" on subscribers for insert with check (auth.uid() = subscriber);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "Users update own subscriptions" on subscribers for update using (auth.uid() = subscriber);
exception when duplicate_object then null;
end $$;

-- =====================
-- Audios policies
-- =====================

do $$ begin
  create policy "Public read public audios" on audios for select using (visibility = 'public' or auth.uid() = userid);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "Users insert own audios" on audios for insert with check (auth.uid() = userid);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "Users update own audios" on audios for update using (auth.uid() = userid);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "Users delete own audios" on audios for delete using (auth.uid() = userid);
exception when duplicate_object then null;
end $$;

-- =====================
-- Stocks policies
-- =====================

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

-- Subscriptions (s2+ via PayPal)
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  paypal_subscription_id text not null unique,
  plan_id text not null,
  status text not null default 'PENDING' check (status in ('PENDING','ACTIVE','SUSPENDED','CANCELLED','EXPIRED')),
  current_period_end timestamptz,
  paypal_email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_subscriptions_user on subscriptions(user_id);
create index if not exists idx_subscriptions_paypal on subscriptions(paypal_subscription_id);

alter table subscriptions enable row level security;

do $$ begin
  create policy "Public read subscription status" on subscriptions for select using (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "Service insert subscriptions" on subscriptions for insert with check (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "Service update subscriptions" on subscriptions for update using (true);
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
