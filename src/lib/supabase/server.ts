import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

export async function createClient(req?: NextRequest) {
  const cookieStore = await cookies()
  const supabase_url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabase_anon_key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const db_schema = process.env.NEXT_PUBLIC_SCHEMA || "public"

  return createServerClient(
    supabase_url,
    supabase_anon_key,
    {
      db: {
        schema: db_schema,
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
