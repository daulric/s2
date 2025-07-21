'use client'

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabase_url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabase_anon_key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const db_schema = process.env.NEXT_PUBLIC_SCHEMA || "public"
  
  return createBrowserClient(
    supabase_url,
    supabase_anon_key,
    {
      db: {
        schema: db_schema,
      }
    }
  )
}
