# Database Schema

This document covers the complete Supabase (PostgreSQL) database schema — all tables, columns, constraints, indexes, relationships, and Row Level Security policies.

The full migration lives in `sql/schema.sql`.

## Schema

All tables are created under the custom schema set by `NEXT_PUBLIC_SCHEMA` (configured as `meetup-app-staging` in the migration file).

## Tables

### profiles

User profiles, linked 1:1 to Supabase Auth users.

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `uuid` | **PK** (= `auth.uid()`) | — |
| `username` | `text` | NOT NULL | — |
| `avatar_url` | `text` | — | `null` |
| `description` | `text` | — | `null` |
| `is_verified` | `boolean` | — | `false` |
| `role` | `text` | NOT NULL, CHECK `('user', 'admin')` | `'user'` |
| `created_at` | `timestamptz` | — | `now()` |

**Indexes:** `idx_profiles_username` on `username`

---

### videos

User-uploaded video content.

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `video_id` | `uuid` | **PK** | `gen_random_uuid()` |
| `userid` | `uuid` | NOT NULL, **FK** → `profiles(id)` CASCADE | — |
| `title` | `text` | NOT NULL | — |
| `description` | `text` | — | `null` |
| `video_path` | `text` | NOT NULL | — |
| `thumbnail_path` | `text` | — | `null` |
| `visibility` | `text` | NOT NULL, CHECK `('public', 'private', 'unlisted')` | `'public'` |
| `category` | `text` | — | `null` |
| `views` | `bigint` | — | `0` |
| `is_short` | `boolean` | — | `false` |
| `created_at` | `timestamptz` | — | `now()` |

**Indexes:** `idx_videos_userid`, `idx_videos_visibility`, `idx_videos_created` (DESC)

---

### video_likes

Like/dislike tracking per user per video.

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `uuid` | **PK** | `gen_random_uuid()` |
| `video_id` | `uuid` | NOT NULL, **FK** → `videos(video_id)` CASCADE | — |
| `userid` | `uuid` | NOT NULL, **FK** → `profiles(id)` CASCADE | — |
| `is_liked` | `boolean` | — | `null` |
| `created_at` | `timestamptz` | — | `now()` |

**Unique constraint:** `(userid, video_id)`

**Indexes:** `idx_video_likes_video`, `idx_video_likes_user`

---

### subscribers

Channel subscription relationships between users.

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `uuid` | **PK** | `gen_random_uuid()` |
| `vendor` | `uuid` | NOT NULL, **FK** → `profiles(id)` CASCADE | — |
| `subscriber` | `uuid` | NOT NULL, **FK** → `profiles(id)` CASCADE | — |
| `is_subscribed` | `boolean` | — | `false` |
| `created_at` | `timestamptz` | — | `now()` |

**Unique constraint:** `(vendor, subscriber)`

**Indexes:** `idx_subscribers_vendor`, `idx_subscribers_subscriber`

---

### audios

User-uploaded music/audio tracks.

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `audio_id` | `uuid` | **PK** | `gen_random_uuid()` |
| `userid` | `uuid` | NOT NULL, **FK** → `profiles(id)` CASCADE | — |
| `title` | `text` | NOT NULL | — |
| `description` | `text` | — | `null` |
| `audio_path` | `text` | NOT NULL | — |
| `thumbnail_path` | `text` | — | `null` |
| `visibility` | `text` | NOT NULL, CHECK `('public', 'private', 'unlisted')` | `'public'` |
| `listens` | `bigint` | — | `0` |
| `created_at` | `timestamptz` | — | `now()` |

**Indexes:** `idx_audios_userid`, `idx_audios_visibility`, `idx_audios_created` (DESC)

---

### stocks

Stock tickers with latest price data.

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `ticker` | `text` | **PK** | — |
| `name` | `text` | NOT NULL | — |
| `exchange` | `text` | — | `null` |
| `sector` | `text` | — | `null` |
| `last_price` | `numeric` | — | `null` |
| `price_change_pct` | `numeric` | — | `null` |
| `volume` | `bigint` | — | `null` |
| `market_cap` | `numeric` | — | `null` |
| `updated_at` | `timestamptz` | — | `now()` |

**Indexes:** `idx_stocks_exchange`

---

### stock_articles

News articles linked to stock tickers.

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `uuid` | **PK** | `gen_random_uuid()` |
| `ticker` | `text` | NOT NULL, **FK** → `stocks(ticker)` CASCADE | — |
| `source` | `text` | NOT NULL | — |
| `headline` | `text` | NOT NULL | — |
| `summary` | `text` | — | `null` |
| `url` | `text` | — | `null` |
| `image_url` | `text` | — | `null` |
| `published_at` | `timestamptz` | NOT NULL | — |
| `created_at` | `timestamptz` | — | `now()` |

**Indexes:** `idx_stock_articles_ticker`, `idx_stock_articles_published` (DESC)

---

### article_sentiments

Sentiment analysis results per article.

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `uuid` | **PK** | `gen_random_uuid()` |
| `article_id` | `uuid` | NOT NULL, **FK** → `stock_articles(id)` CASCADE | — |
| `ticker` | `text` | NOT NULL, **FK** → `stocks(ticker)` CASCADE | — |
| `sentiment_score` | `numeric` | NOT NULL, CHECK `-1 ≤ score ≤ 1` | — |
| `sentiment_label` | `text` | NOT NULL, CHECK `('bullish', 'bearish', 'neutral')` | — |
| `confidence` | `numeric` | NOT NULL, CHECK `0 ≤ confidence ≤ 1` | — |
| `model_used` | `text` | — | `'alphavantage'` |
| `created_at` | `timestamptz` | — | `now()` |

**Indexes:** `idx_article_sentiments_ticker`

---

### stock_predictions

Aggregated sentiment predictions per ticker.

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `uuid` | **PK** | `gen_random_uuid()` |
| `ticker` | `text` | NOT NULL, **FK** → `stocks(ticker)` CASCADE | — |
| `direction` | `text` | NOT NULL, CHECK `('bullish', 'bearish', 'neutral')` | — |
| `score` | `numeric` | NOT NULL, CHECK `-1 ≤ score ≤ 1` | — |
| `confidence` | `numeric` | NOT NULL, CHECK `0 ≤ confidence ≤ 1` | — |
| `article_count` | `int` | NOT NULL | `0` |
| `timeframe` | `text` | NOT NULL | `'24h'` |
| `created_at` | `timestamptz` | — | `now()` |

**Indexes:** `idx_stock_predictions_ticker`, `idx_stock_predictions_created` (DESC)

---

### user_watchlists

Per-user stock watchlist entries.

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `uuid` | **PK** | `gen_random_uuid()` |
| `user_id` | `uuid` | NOT NULL | — |
| `ticker` | `text` | NOT NULL, **FK** → `stocks(ticker)` CASCADE | — |
| `created_at` | `timestamptz` | — | `now()` |

**Unique constraint:** `(user_id, ticker)`

**Indexes:** `idx_user_watchlists_user`

---

### subscriptions

PayPal subscription records for s2+.

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `uuid` | **PK** | `gen_random_uuid()` |
| `user_id` | `uuid` | NOT NULL, **UNIQUE** | — |
| `paypal_subscription_id` | `text` | NOT NULL, **UNIQUE** | — |
| `plan_id` | `text` | NOT NULL | — |
| `status` | `text` | NOT NULL, CHECK `('PENDING', 'ACTIVE', 'SUSPENDED', 'CANCELLED', 'EXPIRED')` | `'PENDING'` |
| `current_period_end` | `timestamptz` | — | `null` |
| `paypal_email` | `text` | — | `null` |
| `created_at` | `timestamptz` | — | `now()` |
| `updated_at` | `timestamptz` | — | `now()` |

**Indexes:** `idx_subscriptions_user`, `idx_subscriptions_paypal`

---

## Entity Relationships

```
profiles ─────┬──< videos ──< video_likes
              ├──< audios
              ├──< subscribers (vendor)
              └──< subscribers (subscriber)

stocks ───────┬──< stock_articles ──< article_sentiments
              ├──< stock_predictions
              └──< user_watchlists

subscriptions (user_id links to auth.uid(), not FK to profiles)
```

## Row Level Security (RLS)

All tables have RLS enabled. Policies follow a pattern of public reads where appropriate and owner-only writes.

### profiles
- **Select:** Public (anyone can read any profile)
- **Insert:** Own row only (`auth.uid() = id`)
- **Update:** Own row only (`auth.uid() = id`)

### videos
- **Select:** Public videos visible to all; private/unlisted visible to owner only (`visibility = 'public' OR auth.uid() = userid`)
- **Insert / Update / Delete:** Own videos only (`auth.uid() = userid`)

### video_likes
- **Select:** Public (like counts visible to all)
- **Insert / Update:** Own likes only (`auth.uid() = userid`)

### subscribers
- **Select:** Public (subscription counts visible to all)
- **Insert / Update:** Own subscriptions only (`auth.uid() = subscriber`)

### audios
- **Select:** Public audio visible to all; private/unlisted visible to owner only
- **Insert / Update / Delete:** Own audio only (`auth.uid() = userid`)

### stocks, stock_articles, article_sentiments, stock_predictions
- **Select:** Public (all stock data is readable)
- **Insert / Update:** Service role only (used by ingestion cron and server actions)

### user_watchlists
- **Select / Insert / Delete:** Own watchlist only (`auth.uid() = user_id`)

### subscriptions
- **Select:** Public (subscription status readable)
- **Insert / Update:** Service role only (used by API routes and webhooks)

## Running the Migration

Open the Supabase SQL Editor and paste the contents of `sql/schema.sql`. The migration is idempotent — all `CREATE TABLE` and `CREATE POLICY` statements use `IF NOT EXISTS` or `DO $$ ... EXCEPTION WHEN duplicate_object` guards.
