import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

export async function createClient(req?: NextRequest) {
  const cookieStore = await cookies()
  const supabase_url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabase_anon_key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const supabase_service_role_key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const db_schema = process.env.NEXT_PUBLIC_SCHEMA || "public"

  const domain =
    process.env.NODE_ENV === "production"
      ? ".daulric.dev"
      : ".localhost:3000";

  return createServerClient(
    supabase_url,
    supabase_service_role_key || supabase_anon_key || "",
    {
      db: {
        schema: db_schema,
      },

      auth: {
        autoRefreshToken: false,
        persistSession: false,
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
            cookiesToSet.forEach(({ name, value, options }) => {
              options = {
                ...options,
                domain,
                path: "/",
                sameSite: "lax",
                secure: process.env.NODE_ENV === "production",
              }

              return req ? req.cookies.set(name, value) : cookieStore.set(name, value, options)
            })

          } catch {}
        },
      },
    }
  )
}
