import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

export async function createClient(req?: NextRequest) {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: {
        schema: process.env.NEXT_PUBLIC_SCHEMA,
      },

      cookies: {
        getAll() {
          if (req) {
            return (req.cookies).getAll()
          }
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              req ? req.cookies.set(name, value) :
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  )
}