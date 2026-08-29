import { createClient } from "@supabase/supabase-js"

const env =
  (typeof import.meta !== "undefined" && import.meta.env) ||
  (globalThis as any).__UZHAVAN_ENV__ ||
  {}

const supabaseUrl =
  env.VITE_SUPABASE_URL || "https://placeholder-url.supabase.co"

const supabaseAnonKey =
  env.VITE_SUPABASE_ANON_KEY || "placeholder-anon-key"

if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) {
  console.warn(
    "Warning: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not defined in environment files. Falling back to placeholder credentials.",
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
