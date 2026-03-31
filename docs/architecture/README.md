# Architecture Overview

## What is s2?

s2 is a web platform combining video/shorts sharing, music hosting, user profiles, and a stock market intelligence dashboard. It is monetized through PayPal subscriptions (s2+). The project is a monorepo with separate frontend and backend services.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript 6 |
| Backend | NestJS (planned), currently Next.js API routes |
| Runtime | Bun |
| UI | Tailwind CSS 4, Base UI / shadcn-style components |
| State | Preact Signals (`@preact/signals-react`) + React Context |
| Auth | Supabase Auth (OTP, OAuth, password) |
| Database | Supabase (PostgreSQL with RLS) |
| Payments | PayPal Subscriptions API |
| Stock Data | Finnhub, Alpha Vantage, Yahoo Finance, Stooq, SEC EDGAR |
| Frontend Hosting | Vercel (with cron jobs) |
| Backend Hosting | Render |
| Analytics | Vercel Analytics + Speed Insights |

## Monorepo Structure

```
s2/
├── package.json                 # Bun workspaces root
├── frontend/                    # Next.js application
│   ├── app/                     # App Router pages and API routes
│   │   ├── api/
│   │   │   ├── paypal/          # Subscription endpoints
│   │   │   └── stocks/          # Data ingestion endpoints
│   │   ├── auth/                # Login/signup
│   │   ├── home/                # Personalized home feed
│   │   ├── music/               # Music browser
│   │   ├── pricing/             # s2+ pricing page
│   │   ├── shorts/              # Vertical shorts feed
│   │   ├── stocks/              # Stock dashboard and detail pages
│   │   ├── upload/              # Media upload and manager
│   │   ├── user/[id]/           # User profile
│   │   ├── video/[videoId]/     # Video watch page
│   │   ├── layout.tsx           # Root layout with providers
│   │   └── page.tsx             # Landing page
│   ├── components/              # UI components
│   │   ├── home/                # Landing page sections
│   │   ├── layout/              # Header, search, skeletons
│   │   ├── media/               # Upload forms
│   │   ├── music/               # Music tiles
│   │   ├── profile/             # Profile card, icon
│   │   ├── stocks/              # Stock cards, charts, sparklines
│   │   ├── ui/                  # Primitives (buttons, dialogs, etc.)
│   │   └── video/               # Video cards, shorts feed
│   ├── context/                 # React Context providers
│   ├── hooks/                   # Custom hooks
│   ├── lib/                     # Utility libraries
│   ├── serverActions/           # Next.js Server Actions
│   ├── sql/                     # Database schema
│   ├── public/                  # Static assets
│   └── package.json
├── backend/                     # NestJS API service (planned)
│   ├── src/
│   │   ├── paypal/              # Subscription endpoints
│   │   ├── stocks/              # Ingestion + WebSocket relay
│   │   └── health/              # Health check
│   └── package.json
└── docs/                        # Documentation
```

## Workspace Configuration

The root `package.json` uses Bun workspaces:

```json
{
  "workspaces": ["frontend", "backend"],
  "scripts": {
    "dev": "concurrently \"bun run dev:frontend\" \"bun run dev:backend\"",
    "dev:frontend": "bun --cwd frontend dev",
    "dev:backend": "bun --cwd backend run start:dev"
  }
}
```

Running `bun install` at the root installs dependencies for both projects. Running `bun dev` starts both dev servers concurrently.

## Provider Hierarchy (Frontend)

The root layout (`frontend/app/layout.tsx`) wraps the application in this order:

```
<TooltipProvider>
  <ThemeProvider>              next-themes (light/dark/system)
    <NavigationProvider>       Route history tracking
      <AuthProvider>           Supabase session + user profile
        <SubscriptionProvider> PayPal subscription state
          <Header />
          {children}
          <Toaster />
        </SubscriptionProvider>
      </AuthProvider>
    </NavigationProvider>
  </ThemeProvider>
</TooltipProvider>
```

| Provider | Purpose |
|----------|---------|
| `ThemeProvider` | Dark/light/system theme switching |
| `NavigationProvider` | Tracks last 10 pages, provides `goBack()` for smart navigation |
| `AuthProvider` | Manages Supabase auth session, loads/creates user profile |
| `SubscriptionProvider` | Fetches s2+ status from `/api/paypal/status` |

## State Management

- **Preact Signals** for fine-grained reactivity in providers and components
- **React Context** for dependency injection (auth, subscription, navigation)
- **`sessionStorage`** for profile caching across page loads

## Route Teardown

Two cleanup components in the root layout handle resource cleanup:

- **`StocksRouteTeardown`** -- shuts down the Finnhub WebSocket and clears stock feed subscriptions when leaving `/stocks/*`
- **`MediaRouteTeardown`** -- cleans up media state when leaving upload routes

## Home Feed

The `/home` page shows a personalized feed based on user role:

- **Guest** -- trending public videos + public audio
- **Logged-in user** -- their own videos + subscription feed
- **s2+ / admin** -- watchlist stocks (or top global stocks) + own videos + subscription feed + music

## Environment Variables

### Frontend (`frontend/.env.*`)

The frontend only needs Supabase credentials (for auth and server actions) and the backend API URL. All secrets for PayPal, stock data, and webhooks live on the backend.

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server actions) | Yes |
| `NEXT_PUBLIC_SCHEMA` | Database schema name | Yes |
| `NEXT_PUBLIC_API_URL` | Backend API URL (e.g. `https://s2-api.onrender.com`) | Yes |

### Backend (`backend/.env`)

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes |
| `FINNHUB_API_KEY` | Finnhub API key | Yes |
| `ALPHAVANTAGE_API_KEY` | Alpha Vantage API key | Yes |
| `PAYPAL_CLIENT_ID` | PayPal client ID | Yes |
| `PAYPAL_SECRET` | PayPal secret | Yes |
| `PAYPAL_MODE` | `sandbox` or `live` | Yes |
| `PAYPAL_PLAN_ID` | PayPal billing plan ID | Yes |
| `PAYPAL_WEBHOOK_ID` | PayPal webhook ID | Production |
| `CRON_SECRET` | Secret for cron authentication | Production |
| `PORT` | Server port | No (default 3001) |

## Deployment

| Service | Platform | Notes |
|---------|----------|-------|
| Frontend | Vercel | Root directory set to `frontend/`. Cron jobs in `vercel.json`. |
| Backend | Render | Root directory set to `backend/`. Always-on (use uptime monitor on free tier). |
