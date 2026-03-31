# s2 Documentation

s2 is a full-stack web platform combining video/shorts sharing, music hosting, user profiles, stock market intelligence, and a premium subscription tier (s2+). It is structured as a monorepo with a Next.js frontend and a NestJS backend.

## Repository Structure

```
s2/
├── frontend/          Next.js application (deployed to Vercel)
├── backend/           NestJS API service (deployed to Render)
├── docs/              Documentation (you are here)
├── package.json       Root workspace config
└── README.md
```

## Docs Index

| Document | Description |
|----------|-------------|
| [Architecture](./architecture/README.md) | Monorepo structure, tech stack, provider hierarchy, state management |
| [Database](./database/README.md) | Supabase schema, tables, RLS policies, entity relationships |
| [Authentication](./authentication/README.md) | Auth flows, providers, session management |
| [API](./api/README.md) | REST endpoints (PayPal, stocks) and Next.js server actions |
| [Media](./media/README.md) | Videos, shorts, music upload and playback |
| [Stocks](./stocks/README.md) | Market data pipeline, real-time feeds, predictions |
| [Pricing](./pricing/README.md) | s2+ subscription system, PayPal integration |
