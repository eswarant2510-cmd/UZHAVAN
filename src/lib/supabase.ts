import { createClient } from "@supabase/supabase-js"

const env =
  (typeof import.meta !== "undefined" && import.meta.env) ||
  (globalThis as any).__UZHAVAN_ENV__ ||
  {}

const supabaseUrl =
  env.VITE_SUPABASE_URL || "https://lnsqponwtnooxngopjxc.supabase.co"

const supabaseAnonKey =
  env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxuc3Fwb253dG5vb3huZ29wanhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5Mjk2ODQsImV4cCI6MjEwMzUwNTY4NH0.xkOUYDuBYHNjOnLfXvzOtZ9iqAWNb-xs0pQtpNkRg4U"

if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) {
  console.warn(
    "Warning: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not defined in environment files. Falling back to placeholder credentials.",
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
