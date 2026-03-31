# s2

A full-stack web platform for videos, music, stocks, and social — built with Next.js and NestJS.

## What is s2?

s2 combines video/shorts sharing, music hosting, a stock market intelligence dashboard with AI-powered sentiment analysis, and social features (follows, profiles, likes) into a single platform. Premium features are gated behind **s2+**, a $5/month subscription via PayPal.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Backend | NestJS (API + WebSocket relay) |
| Runtime | Bun |
| Database | Supabase (PostgreSQL + Auth + Storage + RLS) |
| Payments | PayPal Subscriptions API |
| Stock Data | Finnhub, Alpha Vantage, Yahoo Finance, SEC EDGAR |
| Hosting | Vercel (frontend) + Render (backend) |

## Monorepo Structure

```
s2/
├── frontend/           Next.js application
│   ├── app/            App Router pages and API routes
│   ├── components/     UI components
│   ├── context/        React Context providers
│   ├── hooks/          Custom hooks
│   ├── lib/            Utility libraries
│   ├── serverActions/  Next.js Server Actions
│   ├── sql/            Database schema
│   └── public/         Static assets
├── backend/            NestJS API service
│   └── src/
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
# Edit frontend/.env.local with your keys

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
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SCHEMA=
NEXT_PUBLIC_API_URL=http://localhost:3001
```

The frontend only needs Supabase credentials (for auth and server actions) and the backend API URL. All PayPal, stock data, and webhook secrets live on the backend.

### Backend (`backend/.env`)

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
FINNHUB_API_KEY=
ALPHAVANTAGE_API_KEY=
PAYPAL_CLIENT_ID=
PAYPAL_SECRET=
PAYPAL_MODE=sandbox
PAYPAL_PLAN_ID=
PAYPAL_WEBHOOK_ID=
CRON_SECRET=
PORT=3001
```

## Features

### Videos & Shorts
Upload, watch, and share videos. Vertical shorts with a full-screen swipeable feed. View tracking, likes, and creator profiles.

### Music
Upload and stream audio tracks. Waveform visualization with haptic feedback. Community-driven music library.

### Stocks
Real-time prices across NYSE, Nasdaq, EU, and ECSE exchanges via Finnhub WebSockets. AI-powered sentiment analysis from news articles. Directional predictions, OHLCV charts, and personal watchlists.

### Social
Follow creators, subscribe to channels, like content, and build your profile. Personalized home feed based on your subscriptions.

### s2+
$5/month premium tier via PayPal. Unlocks EU & ECSE markets, priority access to new features, and enhanced analytics.

## Deployment

| Service | Platform | Root Directory |
|---------|----------|---------------|
| Frontend | Vercel | `frontend/` |
| Backend | Render | `backend/` |

The frontend uses Vercel cron jobs for daily stock data ingestion. The backend runs as an always-on service for WebSocket relay and API endpoints.

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
| App Build | Push / PR | Lint + build the frontend |
| Codecov | Push | Run tests and upload coverage |
| CodeQL | Push to main / schedule | Security analysis |
| OSV-Scanner | Push to main / PR / schedule | Dependency vulnerability scanning |
| Lines of Code | Push / PR | Code stats via cloc |
| Discord Notifications | PR merge / workflow success | Team notifications |

## Authors

<a href="https://github.com/daulric/s2/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=daulric/s2" alt="Contributors" />
</a>
