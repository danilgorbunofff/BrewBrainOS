'use server'

import { createClient } from '@/utils/supabase/server'
import webpush from 'web-push'

export async function saveSubscription(subscription: any) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    if (!subscription || !subscription.endpoint) {
      return { success: false, error: 'Invalid subscription' }
    }

    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', subscription.endpoint)

    const { error } = await supabase
      .from('push_subscriptions')
      .insert({
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys?.p256dh,
        auth: subscription.keys?.auth,
      })

    if (error) {
      console.error('Failed to save push subscription:', error)
      return { success: false, error: 'Database error' }
    }

    return { success: true }
  } catch (e: any) {
    console.error('Save subscription error:', e)
    return { success: false, error: e.message }
  }
}

export async function sendTestNotification() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user.id)

    if (error || !subs || subs.length === 0) {
      return { success: false, error: 'No active push subscriptions found. Please enable "Push Notifications" in Settings Hub first.' }
    }

    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:test@example.com',
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
      process.env.VAPID_PRIVATE_KEY || ''
    )

    const payload = JSON.stringify({
      title: 'BrewBrain Alert',
      body: 'Tank 4 is due for a gravity check.',
      url: '/tanks',
    })

    const results = await Promise.allSettled(
      subs.map((sub) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload
        )
      )
    )

    const failed = results.filter((r) => r.status === 'rejected')
    if (failed.length > 0) {
      // Potentially clean up expired subscriptions here
      console.warn('Some notifications failed to send', failed)
    }

    return { success: true }
  } catch (e: any) {
    console.error('Send test notification error:', e)
    return { success: false, error: e.message }
  }
}

export async function sendInventoryAlert(breweryId: string, itemName: string, currentStock: number) {
  try {
    const supabase = await createClient()
    
    // Get brewery owner
    const { data: brewery } = await supabase
      .from('breweries')
      .select('owner_id')
      .eq('id', breweryId)
      .single()

    if (!brewery?.owner_id) return

    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', brewery.owner_id)

    if (error || !subs || subs.length === 0) return

    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:test@example.com',
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
      process.env.VAPID_PRIVATE_KEY || ''
    )

    const payload = JSON.stringify({
      title: 'Low Stock Alert 🔴',
      body: `${itemName} has dropped below the reorder point. Current stock: ${currentStock}.`,
      url: '/inventory',
    })

    await Promise.allSettled(
      subs.map((sub) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        )
      )
    )
  } catch (e) {
    console.error('Failed to send inventory alert:', e)
  }
}

/**
 * Send push notification for reorder alert
 */
export async function sendReorderNotification(
  breweryId: string,
  itemName: string,
  severity: 'info' | 'warning' | 'critical',
  currentStock: number,
  reorderPoint: number,
  daysUntilStockout?: number
) {
  try {
    const supabase = await createClient()

    // Get brewery owner
    const { data: brewery } = await supabase
      .from('breweries')
      .select('owner_id')
      .eq('id', breweryId)
      .single()

    if (!brewery?.owner_id) return

    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', brewery.owner_id)

    if (error || !subs || subs.length === 0) return

    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:test@example.com',
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
      process.env.VAPID_PRIVATE_KEY || ''
    )

    const icon =
      severity === 'critical'
        ? '🚨'
        : severity === 'warning'
          ? '⚠️'
          : 'ℹ️'

    const title =
      severity === 'critical'
        ? `URGENT: ${itemName} Out Soon`
        : severity === 'warning'
          ? `Low Stock Warning: ${itemName}`
          : `Reorder Point Hit: ${itemName}`

    const details = daysUntilStockout
      ? ` (${daysUntilStockout} days until stockout)`
      : ''

    const payload = JSON.stringify({
      title: `${icon} ${title}`,
      body: `${currentStock} in stock (reorder at ${reorderPoint})${details}`,
      tag: `reorder-${breweryId}`,
      data: {
        alertType: 'reorder',
        breweryId,
        severity,
      },
      actions: [
        {
          action: 'view-inventory',
          title: 'View Inventory',
        },
      ],
      url: '/inventory',
    })

    await Promise.allSettled(
      subs.map((sub) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        )
      )
    )
  } catch (e) {
    console.error('Failed to send reorder notification:', e)
  }
}
