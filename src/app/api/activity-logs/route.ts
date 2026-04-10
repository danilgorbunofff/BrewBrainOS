import { NextResponse } from 'next/server'
import { withSentry } from '@/lib/with-sentry'
import { requireActiveBrewery } from '@/lib/require-brewery'

export const runtime = 'nodejs'

const ACTIVITY_TYPES = new Set(['batch', 'tank', 'reading', 'inventory'])

type ActivityType = 'batch' | 'tank' | 'reading' | 'inventory'

interface ActivityEntry {
  id: string
  type: ActivityType
  label: string
  detail: string
  timestamp: string
}

export const GET = withSentry(async (req: Request) => {
  const { supabase, brewery } = await requireActiveBrewery()

  const url = new URL(req.url)
  const typeParam = url.searchParams.get('type') ?? 'all'
  const limitParam = parseInt(url.searchParams.get('limit') ?? '50', 10)
  const limit = Math.min(Math.max(limitParam, 1), 200)

  const selectedTypes: ActivityType[] = typeParam === 'all'
    ? ['batch', 'tank', 'reading', 'inventory']
    : typeParam.split(',').filter(t => ACTIVITY_TYPES.has(t)) as ActivityType[]

  const activities: ActivityEntry[] = []

  const fetches: Promise<void>[] = []

  if (selectedTypes.includes('batch')) {
    fetches.push(
      Promise.resolve(
      supabase
        .from('batches')
        .select('id, recipe_name, status, created_at')
        .eq('brewery_id', brewery.id)
        .order('created_at', { ascending: false })
        .limit(limit)
        .then(({ data }) => {
          for (const b of data ?? []) {
            activities.push({
              id: `b-${b.id}`,
              type: 'batch',
              label: `Batch "${b.recipe_name}"`,
              detail: `Status: ${b.status}`,
              timestamp: b.created_at,
            })
          }
        })
      )
    )
  }

  if (selectedTypes.includes('reading')) {
    fetches.push(
      Promise.resolve(
      supabase
        .from('batch_readings')
        .select('id, gravity, temperature, created_at, batch_id')
        .order('created_at', { ascending: false })
        .limit(limit)
        .then(({ data }) => {
          for (const r of data ?? []) {
            activities.push({
              id: `r-${r.id}`,
              type: 'reading',
              label: 'Voice Reading Logged',
              detail: `Gravity: ${r.gravity ?? '—'} • Temp: ${r.temperature ?? '—'}°`,
              timestamp: r.created_at,
            })
          }
        })
      )
    )
  }

  if (selectedTypes.includes('tank')) {
    fetches.push(
      Promise.resolve(
      supabase
        .from('tanks')
        .select('id, name, status, created_at')
        .eq('brewery_id', brewery.id)
        .order('created_at', { ascending: false })
        .limit(limit)
        .then(({ data }) => {
          for (const t of data ?? []) {
            activities.push({
              id: `t-${t.id}`,
              type: 'tank',
              label: `Tank "${t.name}" registered`,
              detail: `Status: ${t.status}`,
              timestamp: t.created_at,
            })
          }
        })
      )
    )
  }

  if (selectedTypes.includes('inventory')) {
    fetches.push(
      Promise.resolve(
      supabase
        .from('inventory')
        .select('id, name, item_type, created_at')
        .eq('brewery_id', brewery.id)
        .order('created_at', { ascending: false })
        .limit(limit)
        .then(({ data }) => {
          for (const inv of data ?? []) {
            activities.push({
              id: `inv-${inv.id}`,
              type: 'inventory',
              label: `Inventory item "${inv.name}"`,
              detail: `Type: ${inv.item_type}`,
              timestamp: inv.created_at,
            })
          }
        })
      )
    )
  }

  await Promise.all(fetches)

  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return NextResponse.json({ activities: activities.slice(0, limit) })
}, {
  name: 'api/activity-logs',
  onError: () => NextResponse.json({ error: 'Failed to load activity logs' }, { status: 500 }),
})
