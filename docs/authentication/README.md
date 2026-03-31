# Authentication

This document covers the authentication system — Supabase Auth integration, supported methods, the AuthProvider, and the login flow.

## Overview

s2 uses **Supabase Auth** for all authentication. The system supports three sign-in methods and automatically creates a `profiles` row for new users.

```
┌──────────────┐     ┌──────────────┐     ┌─────────────┐
│   AuthPage    │────▶│  AuthProvider │────▶│  Supabase   │
│  (/auth)      │     │  (Context)   │     │  Auth API   │
└──────────────┘     └──────┬───────┘     └──────┬──────┘
                            │                     │
                            ▼                     │
                     ┌──────────────┐             │
                     │   profiles   │◀────────────┘
                     │   (table)    │   Auto-created on
                     └──────────────┘   first sign-in
```

## Sign-in Methods

### 1. Email OTP (Primary)

The default sign-in method. No password required.

1. User enters their email on `/auth`
2. `signInWithOtp(email)` sends a 6-digit code via Supabase
3. User enters the OTP
4. `verifyOtp(email, token)` validates the code
5. On success, the user is redirected to their previous page (or `/home`)

### 2. OAuth (GitHub, Google)

Social sign-in via Supabase OAuth.

1. User clicks the GitHub or Google button
2. `oauth(provider, redirectTo)` initiates the OAuth flow
3. Supabase handles the provider redirect
4. On return, `onAuthStateChange` fires and the profile is loaded/created

### 3. Password + Captcha (Legacy)

Available via the `signIn` and `signUp` methods but not currently exposed in the AuthPage UI. Supports Cloudflare Turnstile captcha tokens.

## AuthProvider

**File:** `frontend/context/AuthProvider.tsx`

The `AuthProvider` wraps the entire app and provides authentication state through React Context.

### Exposed State

| Field | Type | Description |
|-------|------|-------------|
| `user.user` | `User \| null` | Supabase `User` object |
| `user.profile` | `UserProfile \| null` | Row from the `profiles` table |
| `loading` | `boolean` | True during auth operations |
| `error` | `string \| null` | Last error message |

### Exposed Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `signIn` | `(credentials) => Promise` | Email + password sign-in with optional captcha |
| `signInWithOtp` | `(email: string) => Promise` | Send OTP to email |
| `verifyOtp` | `(email, token) => Promise` | Verify 6-digit OTP |
| `signUp` | `(credentials) => Promise` | Create account with email + password |
| `signOut` | `() => Promise<void>` | Sign out and refresh |
| `resetPassword` | `(email) => Promise<void>` | Send password reset email |
| `oauth` | `(provider, redirectTo?) => Promise` | OAuth sign-in (github, google, etc.) |
| `supabase` | `SupabaseClient` | Direct Supabase client access |

### Usage

```tsx
import { useAuth } from "@/context/AuthProvider"

function MyComponent() {
  const { user: { user, profile }, loading, signOut } = useAuth()

  if (loading) return <Spinner />
  if (!user) return <LoginPrompt />

  return (
    <div>
      <p>Welcome, {profile?.username}</p>
      <button onClick={signOut}>Sign Out</button>
    </div>
  )
}
```

## Profile Auto-Creation

When a user signs in for the first time, the AuthProvider automatically creates a `profiles` row:

```typescript
{
  id: session_user.id,
  username: session_user.user_metadata?.full_name
            || session_user.email?.split("@")[0]
            || "unknown",
  avatar_url: session_user.user_metadata?.avatar_url || null,
  description: null,
  is_verified: false
}
```

The profile is cached in `sessionStorage` under the key `profile_user` for fast access across page loads.

## UserProfile Type

```typescript
type UserProfile = {
  id: string
  username: string
  avatar_url?: string
  role?: string           // "user" | "admin"
}
```

## Supabase Client Setup

### Browser Client (`frontend/lib/supabase/client.ts`)

Uses `@supabase/ssr` with `createBrowserClient`. Configured with:
- Custom schema from `NEXT_PUBLIC_SCHEMA`
- `autoRefreshToken: false` and `persistSession: false` (session managed via cookies)

### Server Client (`frontend/lib/supabase/server.ts`)

Uses `@supabase/ssr` with `createServerClient`. Configured with:
- Prefers `SUPABASE_SERVICE_ROLE_KEY` over anon key for elevated permissions
- Cookie-based session via `next/headers`
- Accepts optional `NextRequest` for route handler usage

## Navigation After Auth

The `AuthProvider` uses the `NavigationProvider` to redirect users back to where they came from after sign-in:

- **OTP verification** and **password sign-in** redirect to `navigate.previousPage` after a 100ms delay
- **OAuth** sets `redirectTo` to the previous page origin
- **Sign-up** triggers a `router.refresh()` instead of redirect

The `NavigationProvider` excludes auth-related pages from the history stack, so users never get redirected back to `/auth`.

## Related Files

| File | Purpose |
|------|---------|
| `frontend/context/AuthProvider.tsx` | Auth context provider and `useAuth` hook |
| `frontend/app/auth/AuthPage.tsx` | Login/signup UI component |
| `frontend/app/auth/page.tsx` | Auth route page |
| `frontend/lib/supabase/client.ts` | Browser Supabase client |
| `frontend/lib/supabase/server.ts` | Server Supabase client |
| `frontend/context/NavigationProvider.tsx` | Route history for post-auth redirect |
