# Architecture Overview

## What is s2?

s2 is a web platform combining video/shorts sharing, music hosting, user profiles, and a stock market intelligence dashboard. It is monetized through PayPal subscriptions (s2+). The project is a monorepo with separate frontend and backend services.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript 6 |
| Backend | NestJS (REST API + WebSocket gateway) |
| Runtime | Bun |
| UI | Tailwind CSS 4, Base UI / shadcn-style components |
| State | Preact Signals (`@preact/signals-react`) + React Context |
| Auth | Supabase Auth (OTP, OAuth, password) |
| Database | Supabase (PostgreSQL with RLS) |
| Payments | PayPal Subscriptions API (backend only) |
| Stock Data | Finnhub, Alpha Vantage, Yahoo Finance, Stooq, SEC EDGAR |
| Frontend Hosting | Vercel (with cron jobs) |
| Backend Hosting | Render |
| Analytics | Vercel Analytics + Speed Insights |

## Monorepo Structure

```
s2/
├── package.json                 # Bun workspaces root
├── frontend/                    # Next.js application
│   ├── app/                     # App Router pages
│   │   ├── api/stocks/ingest/   # Vercel cron proxy → backend
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
│   ├── context/                 # React Context providers
│   ├── hooks/                   # Custom hooks
│   ├── lib/                     # Utility libraries
│   │   ├── backend-fetch.ts     # Authenticated fetch to backend API
│   │   ├── stocks/              # Stock types, market hours, candle helpers
│   │   └── supabase/            # Supabase client/server utilities
│   ├── serverActions/           # Next.js Server Actions
│   ├── sql/                     # Database schema
│   └── public/                  # Static assets
├── backend/                     # NestJS API service
│   ├── src/
│   │   ├── auth/                # Guards + AccessControlService
│   │   ├── paypal/              # Subscription endpoints + webhooks
│   │   ├── stocks/              # Ingestion, cron, WebSocket gateway
│   │   │   └── lib/             # API clients (Finnhub, Alpha Vantage, etc.)
│   │   ├── supabase/            # Supabase client service
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

## Frontend ↔ Backend Communication

The frontend communicates with the NestJS backend in two ways:

1. **REST API** — client-side fetches via `backendFetch()` (`frontend/lib/backend-fetch.ts`), which reads the Supabase access token and sends it as `Authorization: Bearer <token>`
2. **WebSocket** — `use-stock-feed.ts` connects to `ws(s)://<backend>/ws/stocks?token=<supabase_token>` for real-time stock trades

The backend authenticates all requests using `SupabaseAuthGuard` (extracts and validates the Bearer token). Premium features are gated by `SubscriptionGuard` / `AccessControlService`.

### What lives where

| Concern | Location | Reason |
|---------|----------|--------|
| PayPal API calls | Backend | Secrets stay server-side |
| Stock ingestion (seed, ingest, ecse-snapshot) | Backend | Cron + API keys |
| Finnhub WebSocket relay | Backend | Single server connection, fan-out to clients |
| Stock price updates + WS broadcast | Backend | `POST /stocks/update` → WS push |
| Server Actions (GetStockDetails, GetVideoDetails) | Frontend | SSR performance, no extra network hop |
| Supabase auth session | Frontend | Client-side auth state |
| Vercel cron | Frontend (proxy) | `GET /api/stocks/ingest` forwards to backend |

## Provider Hierarchy (Frontend)

The root layout (`frontend/app/layout.tsx`) wraps the application in this order:

```
<TooltipProvider>
  <ThemeProvider>              next-themes (light/dark/system)
    <NavigationProvider>       Route history tracking
      <AuthProvider>           Supabase session + user profile
        <SubscriptionProvider> Subscription state (from backend)
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
| `SubscriptionProvider` | Fetches s2+ status from backend `GET /paypal/status` |

## State Management

- **Preact Signals** for fine-grained reactivity in providers and components
- **React Context** for dependency injection (auth, subscription, navigation)
- **`sessionStorage`** for profile caching across page loads

## Access Control (Backend)

The `AccessControlService` (`backend/src/auth/access-control.service.ts`) is the single source of truth for authorization:

```typescript
const { role, isAdmin, isSubscribed, allowed } = await this.access.resolve(userId);
```

It checks `profiles.role` for admin status and the `subscriptions` table for active s2+ subscriptions. Used by:

- `SubscriptionGuard` — HTTP route guard for premium endpoints
- `StocksGateway` — WebSocket connection authorization

## Route Teardown

Two cleanup components in the root layout handle resource cleanup:

- **`StocksRouteTeardown`** — shuts down the backend WebSocket connection and clears stock feed subscriptions when leaving `/stocks/*`
- **`MediaRouteTeardown`** — cleans up media state when leaving upload routes

## Home Feed

The `/home` page shows a personalized feed based on user role:

- **Guest** — trending public videos + public audio
- **Logged-in user** — their own videos + subscription feed
- **s2+ / admin** — watchlist stocks (or top global stocks) + own videos + subscription feed + music

## Environment Variables

### Frontend (`frontend/.env.*`)

The frontend only needs Supabase credentials, the backend URL, and Cloudflare Turnstile. All secrets for PayPal, stock data, and webhooks live on the backend.

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `NEXT_PUBLIC_SCHEMA` | Database schema name | Yes |
| `NEXT_PUBLIC_BACKEND_URL` | Backend API URL (e.g. `http://localhost:3001`) | Yes |
| `NEXT_PUBLIC_PROFILE` | Avatar URL template | Yes |
| `CLOUDFLARE_TURNSTILE_SECRET_KEY` | Turnstile captcha secret | Production |

### Backend (`backend/.env`)

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes |
| `SCHEMA` | Database schema name (e.g. `meetup-app`) | Yes |
| `FINNHUB_API_KEY` | Finnhub API key | Yes |
| `ALPHAVANTAGE_API_KEY` | Alpha Vantage API key | Yes |
| `PAYPAL_CLIENT_ID` | PayPal client ID | Yes |
| `PAYPAL_SECRET` | PayPal secret | Yes |
| `PAYPAL_MODE` | `sandbox` or `live` | Yes |
| `PAYPAL_PLAN_ID` | PayPal billing plan ID | Yes |
| `PAYPAL_WEBHOOK_ID` | PayPal webhook ID | Production |
| `CRON_SECRET` | Secret for cron authentication | Production |
| `PORT` | Server port | No (default 3001) |
| `FRONTEND_URL` | Frontend origin for CORS | Yes |

## Deployment

| Service | Platform | Notes |
|---------|----------|-------|
| Frontend | Vercel | Root directory set to `frontend/`. Cron jobs in `vercel.json`. |
| Backend | Render | Root directory set to `backend/`. Build: `bun install && bun run build`. Start: `bun run start:prod`. |
