'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

interface RealtimeRefreshProps {
  table: string
  breweryId: string
}

/**
 * A invisible component that listens for Postgres changes on a specific table
 * and triggers a `router.refresh()` to keep the server-rendered UI in sync.
 */
export function RealtimeRefresh({ table, breweryId }: RealtimeRefreshProps) {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel(`realtime-${table}-${breweryId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for INSERT, UPDATE, and DELETE
          schema: 'public',
          table: table,
          filter: `brewery_id=eq.${breweryId}`
        },
        () => {
          // Trigger a silent re-fetch of the RSC tree
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, breweryId, router, supabase])

  return null
}
