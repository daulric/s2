# s2

A full-stack web platform for videos, music, stocks, and social — built with Next.js and NestJS.

## What is s2?

s2 combines video/shorts sharing, music hosting, a stock market intelligence dashboard with AI-powered sentiment analysis, and social features (follows, profiles, likes) into a single platform. Premium features are gated behind **s2+**, a $5/month subscription via PayPal.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Backend | NestJS (REST API + WebSocket gateway) |
| Runtime | Bun |
| Database | Supabase (PostgreSQL + Auth + Storage + RLS) |
| Payments | PayPal Subscriptions API |
| Stock Data | Finnhub, Alpha Vantage, Yahoo Finance, SEC EDGAR |
| Hosting | Vercel (frontend) + Render (backend) |

## Monorepo Structure

```
s2/
├── frontend/           Next.js application
│   ├── app/            App Router pages
│   ├── components/     UI components
│   ├── context/        React Context providers
│   ├── hooks/          Custom hooks (incl. WebSocket stock feed)
│   ├── lib/            Utility libraries
│   ├── serverActions/  Next.js Server Actions
│   ├── sql/            Database schema
│   └── public/         Static assets
├── backend/            NestJS API service
│   └── src/
│       ├── auth/       Auth guards, access control service
│       ├── paypal/     Subscription endpoints + webhooks
│       ├── stocks/     Ingestion, cron routes, WebSocket gateway
│       │   └── lib/    Stock API clients (Finnhub, Alpha Vantage, etc.)
│       ├── supabase/   Supabase client service
│       └── health/     Health check
├── docs/               Documentation
├── .github/workflows/  CI/CD pipelines
└── package.json        Bun workspaces root
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (latest)
- A [Supabase](https://supabase.com) project
- A [PayPal Developer](https://developer.paypal.com) account (for s2+)
- API keys for [Finnhub](https://finnhub.io) and [Alpha Vantage](https://www.alphavantage.co) (for stocks)

### Setup

```bash
# Clone the repo
git clone https://github.com/daulric/s2.git
cd s2

# Install all dependencies (workspaces)
bun install

# Set up environment variables
cp frontend/.env.development frontend/.env.local
cp backend/.env.example backend/.env
# Edit both with your keys

# Run the database migration
# Paste frontend/sql/schema.sql into the Supabase SQL Editor

# Start development
bun dev
```

This starts both the frontend (Next.js on port 3000) and backend (NestJS on port 3001) concurrently.

### Run individually

```bash
bun run dev:frontend    # Next.js only
bun run dev:backend     # NestJS only
```

## Environment Variables

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SCHEMA=
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_PROFILE=https://api.dicebear.com/7.x/avataaars/svg?seed=
CLOUDFLARE_TURNSTILE_SECRET_KEY=
```

The frontend only needs Supabase credentials (for auth and server actions), the backend URL, and Cloudflare Turnstile for captcha. All PayPal, stock data, and webhook secrets live exclusively on the backend.

### Backend (`backend/.env`)

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SCHEMA=meetup-app
FINNHUB_API_KEY=
ALPHAVANTAGE_API_KEY=
PAYPAL_CLIENT_ID=
PAYPAL_SECRET=
PAYPAL_MODE=sandbox
PAYPAL_PLAN_ID=
PAYPAL_WEBHOOK_ID=
CRON_SECRET=
PORT=3001
FRONTEND_URL=http://localhost:3000
```

## Architecture

### Backend (NestJS)

The backend is the single source of truth for all API operations:

- **PayPal** — subscription creation, activation, cancellation, status checks, and webhook processing
- **Stocks** — seeding from SEC EDGAR/ECSE/EU, daily ingestion (prices, news, sentiments, predictions), ECSE scraping, exchange migration
- **WebSocket** — Finnhub trade relay for s2+ subscribers via `/ws/stocks`
- **Access Control** — centralized `AccessControlService` checks `profiles.role` and `subscriptions` table

The frontend calls the backend via `NEXT_PUBLIC_BACKEND_URL` with Supabase Bearer tokens for authentication.

### Frontend (Next.js)

- **Pages** — App Router with SSR via Server Actions for stocks, videos, music
- **Server Actions** — `GetStockDetails`, `GetVideoDetails`, etc. query Supabase directly for SSR performance
- **Client fetches** — PayPal and stock update flows go through `backendFetch()` which attaches the Supabase access token
- **WebSocket** — `use-stock-feed.ts` connects to the backend's `/ws/stocks` gateway (not directly to Finnhub)
- **Vercel Cron** — `/api/stocks/ingest` is a thin proxy that forwards to the backend

## Features

### Videos & Shorts
Upload, watch, and share videos. Vertical shorts with a full-screen swipeable feed. View tracking, likes, and creator profiles.

### Music
Upload and stream audio tracks. Waveform visualization with haptic feedback. Community-driven music library.

### Stocks
Real-time prices across NYSE, Nasdaq, EU, and ECSE exchanges via the backend WebSocket gateway. AI-powered sentiment analysis from news articles. Directional predictions, OHLCV charts, and personal watchlists.

### Social
Follow creators, subscribe to channels, like content, and build your profile. Personalized home feed based on your subscriptions.

### s2+
$5/month premium tier via PayPal. Unlocks live stock WebSocket feed, EU & ECSE markets, priority access to new features, and enhanced analytics.

## Deployment

| Service | Platform | Root Directory | Build Command | Start Command |
|---------|----------|---------------|---------------|---------------|
| Frontend | Vercel | `frontend/` | (auto) | (auto) |
| Backend | Render | `backend/` | `bun install && bun run build` | `bun run start:prod` |

The backend runs on Render as an always-on service. The frontend deploys to Vercel with a cron job that proxies to the backend for daily stock ingestion.

### Backend env on Render

Set all variables from `backend/.env` in Render's Environment tab. Set `FRONTEND_URL` to your Vercel production domain for CORS.

### Frontend env on Vercel

Set the minimal frontend variables. `NEXT_PUBLIC_BACKEND_URL` should point to the Render service URL (e.g. `https://s2-api.onrender.com`).

## Documentation

Detailed docs are in the [`docs/`](./docs/) folder:

- [Architecture](./docs/architecture/README.md) — monorepo structure, providers, state management
- [Database](./docs/database/README.md) — schema, tables, RLS policies
- [Authentication](./docs/authentication/README.md) — auth flows, Supabase integration
- [API](./docs/api/README.md) — REST endpoints, server actions
- [Media](./docs/media/README.md) — video, shorts, music systems
- [Stocks](./docs/stocks/README.md) — market data pipeline, real-time feeds
- [Pricing](./docs/pricing/README.md) — s2+ subscription system

## CI/CD

GitHub Actions workflows:

| Workflow | Trigger | Description |
|----------|---------|-------------|
| App Build | Push / PR | Lint + build both frontend and backend |
| Codecov | Push | Run tests and upload coverage |
| CodeQL | Push to main / schedule | Security analysis |
| OSV-Scanner | Push to main / PR / schedule | Dependency vulnerability scanning |
| Lines of Code | Push / PR | Code stats via cloc |
| Discord Notifications | PR merge / workflow success | Team notifications |

## Authors

<a href="https://github.com/daulric/s2/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=daulric/s2" alt="Contributors" />
</a>
