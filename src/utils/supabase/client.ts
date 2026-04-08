import { createBrowserClient } from '@supabase/ssr'
import { getRequiredEnv } from '@/lib/env'

export function createClient() {
  const url = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL', 'public')
  
  if (process.env.NODE_ENV === 'production' && url.includes('localhost')) {
    console.error('CRITICAL WARNING: Localhost Supabase URL detected in production build (Vercel/Preview). Check your environment variables!')
  }

  return createBrowserClient(
    url,
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'public')
  )
}
