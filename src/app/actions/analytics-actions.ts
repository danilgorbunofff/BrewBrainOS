'use server'

import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'
import { getActiveBrewery } from '@/lib/active-brewery'
import { sanitizeDbError } from '@/lib/utils'

const daysSchema = z.number().int().min(1).max(365)

/**
 * Advanced Analytics: Inventory Usage Trends
 * Aggregates inventory consumption and waste over time.
 */
export async function getInventoryTrends(days: number = 90) {
  const parsedDays = daysSchema.safeParse(days)
  const safeDays = parsedDays.success ? parsedDays.data : 90

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const brewery = await getActiveBrewery()
  if (!brewery) throw new Error('No active brewery context')

  // Calculate cutoff date
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - safeDays)
  const cutoffStr = cutoff.toISOString()

  // We fetch history grouped by day/week. 
  // For MVP simplicity without raw SQL GROUP BY, we fetch and reduce in-memory.
  // In production, converting this to a Supabase RPC or view is better for massive data.
  const { data, error } = await supabase
    .from('inventory_history')
    .select(`
      quantity_change,
      change_type,
      created_at
    `)
    .eq('brewery_id', brewery.id)
    .gte('created_at', cutoffStr)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching inventory trends:', error)
    return []
  }

  // Aggregate by Date (YYYY-MM-DD or MM/DD format depending on days range)
  const isShortTerm = safeDays <= 30
  
  const grouped = data.reduce((acc: Record<string, unknown>, row) => {
    const d = new Date(row.created_at!)
    // Format to short date like 'Apr 05' or 'Week 14'
    const key = isShortTerm 
      ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : `Wk ${getWeekNumber(d)}`
      
    if (!acc[key]) {
      acc[key] = { date: key, usage: 0, waste: 0, additions: 0 }
    }

    const value = Math.abs(row.quantity_change)

    switch (row.change_type) {
      case 'recipe_usage':
        acc[key].usage += value
        break
      case 'waste':
        acc[key].waste += value
        break
      case 'received':
        acc[key].additions += value
        break
      // ignore stock_adjustment or 'other' unless negative (which might be shrinkage)
      default:
        // if negative, assume waste/shrinkage
        if (row.quantity_change < 0) {
          acc[key].waste += value
        }
        break
    }
    
    return acc
  }, {})

  // Convert to array and ensure chronological
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Object.values(grouped).map((g: any) => ({
    ...g,
    usage: Number(g.usage.toFixed(2)),
    waste: Number(g.waste.toFixed(2)),
    additions: Number(g.additions.toFixed(2)),
  }))
}

/**
 * Advanced Analytics: Batch Performance
 * Aggregates brewing efficiency metrics (Actual vs Target).
 */
export async function getBatchPerformance() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const brewery = await getActiveBrewery()
  if (!brewery) throw new Error('No active brewery context')

  // Fetch batches with their latest brewing log
  const { data, error } = await supabase
    .from('batches')
    .select(`
      id,
      recipe_name,
      og,
      fg,
      status,
      recipe_id,
      recipes (
        target_og,
        target_fg,
        target_ibu
      ),
      batch_brewing_logs (
        actual_ibu_calculated,
        boil_off_rate_pct
      )
    `)
    .eq('brewery_id', brewery.id)
    .order('created_at', { ascending: false })
    .limit(20) // Get the last 20 batches for trend line

  if (error) {
    console.error('Error fetching batch performance:', sanitizeDbError(error, 'getBatchPerformance'))
    return []
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((b: any) => {
    const brewLog = b.batch_brewing_logs?.[0] || {}
    const recipe = b.recipes || {}
    
    // Normalize string numbers representing batch ID prefix
    const shortId = b.id.substring(0, 5).toUpperCase()

    // Generate efficiency score (Target OG vs Actual OG) simple mapping
    const expectedPoints = recipe.target_og ? (recipe.target_og - 1) * 1000 : 0
    const actualPoints = b.og ? (b.og - 1) * 1000 : 0
    const efficiencyPct = expectedPoints && actualPoints 
      ? Math.min(100, (actualPoints / expectedPoints) * 100) 
      : 0

    return {
      batchId: shortId,
      name: b.recipe_name,
      targetOG: recipe.target_og || null,
      actualOG: b.og || null,
      efficiency: Number(efficiencyPct.toFixed(1)),
      boilOff: brewLog.boil_off_rate_pct || null,
      status: b.status
    }
  }).reverse() // Chronological order (oldest to newest in chart)
}

// Simple ISO week number calculator
function getWeekNumber(d: Date) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return weekNo
}
