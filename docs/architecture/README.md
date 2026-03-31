# Architecture Overview

This document covers the s2 project structure, tech stack, provider hierarchy, and key architectural decisions.

## What is s2?

s2 is a Next.js web application described as a "fuze successor." It combines video/shorts sharing, music hosting, user profiles, and a stock market intelligence dashboard — all backed by Supabase and monetized through PayPal subscriptions (s2+).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 6 |
| Runtime | Bun (build/start), Node.js compatible |
| UI | React 19, Tailwind CSS 4, Base UI / shadcn-style components |
| State | Preact Signals (`@preact/signals-react`) + React Context |
| Auth | Supabase Auth (OTP, OAuth, password) |
| Database | Supabase (PostgreSQL with RLS) |
| Payments | PayPal Subscriptions API |
| Stock Data | Finnhub, Alpha Vantage, Yahoo Finance, Stooq, SEC EDGAR |
| Hosting | Vercel (with cron jobs) |
| Analytics | Vercel Analytics + Speed Insights |

## Directory Structure

```
s2/
├── app/                      # Next.js App Router pages and API routes
│   ├── api/
│   │   ├── paypal/           # Subscription endpoints (create, subscribe, cancel, status, webhook)
│   │   └── stocks/           # Data ingestion endpoints (ingest, seed, migrate, ecse-snapshot)
│   ├── auth/                 # Login/signup page
│   ├── auth-required/        # Shown for unauthenticated users on protected routes
│   ├── home/                 # Logged-in home feed
│   ├── install-app/          # PWA install flow
│   ├── music/                # Public music browser
│   ├── pricing/              # s2+ subscription pricing page
│   ├── search/               # Search
│   ├── settings/             # User settings
│   ├── shorts/               # Vertical shorts feed
│   ├── stocks/               # Stock dashboard and [ticker] detail
│   ├── upload/               # Video and music upload + media manager
│   ├── user/[id]/            # User profile page
│   ├── video/[videoId]/      # Video watch page
│   ├── layout.tsx            # Root layout with provider hierarchy
│   └── page.tsx              # Landing page
├── components/               # Reusable UI components
│   ├── home/                 # Landing page components
│   ├── layout/               # Header, search, theme toggle, skeletons
│   ├── media/                # Upload forms, media manager
│   ├── music/                # Music tiles, edit dialogs
│   ├── profile/              # Profile card, icon
│   ├── stocks/               # Stock cards, charts, sparklines, sentiment badges
│   ├── system/               # PWA gate, loading spinner
│   ├── ui/                   # shadcn-style primitives (buttons, dialogs, charts, etc.)
│   └── video/                # Video cards, shorts feed, playback controls
├── context/                  # React Context providers
├── hooks/                    # Custom React hooks
├── lib/                      # Server/client utility libraries
│   ├── audios/               # Audio data formatting
│   ├── stocks/               # Stock APIs, market hours, types, utilities
│   ├── supabase/             # Supabase client/server initialization
│   ├── user/                 # PWA helpers, share utilities
│   ├── videos/               # Video data formatting, thumbnails
│   ├── paypal.ts             # PayPal API client (auth, subscriptions, webhook verification)
│   ├── subscription.ts       # Server-side subscription checks
│   └── utils.ts              # cn() Tailwind class merging
├── serverActions/            # Next.js Server Actions
├── sql/                      # Database schema (schema.sql)
├── docs/                     # Documentation
└── public/                   # Static assets
```

## Provider Hierarchy

The root layout (`app/layout.tsx`) wraps the application in a specific provider order:

```
<TooltipProvider>
  <ThemeProvider>              ← next-themes (light/dark/system)
    <NavigationProvider>       ← Route history tracking
      <AuthProvider>           ← Supabase session + user profile
        <SubscriptionProvider> ← PayPal subscription state
          <Header />
          {children}
          <Toaster />
        </SubscriptionProvider>
      </AuthProvider>
    </NavigationProvider>
  </ThemeProvider>
</TooltipProvider>
```

### Provider Details

| Provider | Source | Purpose |
|----------|--------|---------|
| `ThemeProvider` | `next-themes` | Dark/light/system theme switching |
| `NavigationProvider` | `context/NavigationProvider.tsx` | Tracks last 10 pages visited, provides `goBack()` and `previousPage` for smart navigation; excludes auth/admin/API routes |
| `AuthProvider` | `context/AuthProvider.tsx` | Manages Supabase auth session, loads/creates user profile, exposes sign-in/sign-up/sign-out methods |
| `SubscriptionProvider` | `context/SubscriptionProvider.tsx` | Fetches subscription status from `/api/paypal/status`, exposes `subscribed` boolean and `refresh()` |

## State Management

s2 uses a hybrid state approach:

- **Preact Signals** (`@preact/signals-react`) for fine-grained reactivity in global providers and component-level state (avoids unnecessary re-renders)
- **React Context** for dependency injection of auth, subscription, and navigation state
- **React `useState`/`useSignal`** for local component state
- **`sessionStorage`** for profile caching across page loads

## Route Teardown

Two cleanup components run inside `<Suspense>` in the root layout:

- **`StocksRouteTeardown`** — Shuts down the Finnhub WebSocket connection and clears all stock feed subscriptions when the user navigates away from `/stocks/*`
- **`MediaRouteTeardown`** — Cleans up media-related state when leaving upload routes

## Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `next dev` | Development server (Turbopack) |
| `dev:bun` | `bun --bun run next dev` | Dev server via Bun runtime |
| `dev:webpack` | `next dev --webpack` | Dev server with Webpack bundler |
| `build` | `bun --bun run next build` | Production build |
| `start` | `bun --bun run next start` | Production server |
| `lint` | `eslint .` | Lint check |
| `lint:fix` | `eslint --fix` | Auto-fix lint issues |
| `analyze` | `ANALYZE=true next build` | Bundle analysis |
| `preview` | Build + start | Local production preview |

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only) | Yes |
| `NEXT_PUBLIC_SCHEMA` | Database schema name | Yes |
| `FINNHUB_API_KEY` | Finnhub API key (server only) | Yes |
| `NEXT_PUBLIC_FINNHUB_API_KEY` | Finnhub key for WebSocket (client) | Yes |
| `ALPHAVANTAGE_API_KEY` | Alpha Vantage API key | Yes |
| `PAYPAL_CLIENT_ID` | PayPal client ID (server) | Yes |
| `PAYPAL_SECRET` | PayPal secret (server) | Yes |
| `PAYPAL_MODE` | `sandbox` or `live` | Yes |
| `PAYPAL_PLAN_ID` | PayPal billing plan ID | Yes |
| `PAYPAL_WEBHOOK_ID` | PayPal webhook ID for signature verification | Production |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | PayPal client ID (browser) | Yes |
| `NEXT_PUBLIC_PAYPAL_PLAN_ID` | PayPal plan ID (browser) | Yes |
| `CRON_SECRET` | Secret for authenticating cron requests | Production |

## Deployment

The app is deployed on **Vercel** with:

- **Cron jobs** defined in `vercel.json`: daily stock ingestion at `0 6 * * *` hitting `/api/stocks/ingest`
- **Bundle analysis** available via `ANALYZE=true next build`
- **Vercel Analytics** and **Speed Insights** for performance monitoring
