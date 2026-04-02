import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  
  if (process.env.NODE_ENV === 'production' && url.includes('localhost')) {
    console.error('CRITICAL WARNING: Localhost Supabase URL detected in production build (Vercel/Preview). Check your environment variables!')
  }

  return createBrowserClient(
    url,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
