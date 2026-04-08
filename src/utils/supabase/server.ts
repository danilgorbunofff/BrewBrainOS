import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getRequiredEnv } from '@/lib/env'

export async function createClient() {
  const cookieStore = await cookies()
  const url = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL', 'public')

  if (process.env.NODE_ENV === 'production' && url.includes('localhost')) {
    console.error('CRITICAL WARNING: Localhost Supabase URL detected in production build (Vercel/Preview). Check your environment variables!')
  }

  return createServerClient(
    url,
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'public'),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
