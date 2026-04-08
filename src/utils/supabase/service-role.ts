import { createClient } from '@supabase/supabase-js'
import { getRequiredEnv } from '@/lib/env'

export function createServiceRoleClient() {
  return createClient(
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL', 'public'),
    getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}