'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { saveSubscription, sendTestNotification } from '@/app/actions/push-actions'
import { LucideBellRing, LucideBellOff, LucideLoader2 } from 'lucide-react'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function PushNotificationManager() {
  const [isSupported, setIsSupported] = useState(false)
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true)
      registerServiceWorker()
    }
  }, [])

  async function registerServiceWorker() {
    try {
      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.getSubscription()
      setSubscription(sub)
    } catch (error) {
      console.error('SW Registration error:', error)
    }
  }

  async function handleSubscribe() {
    setLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!)
      })
      setSubscription(sub)
      
      const subJSON = sub.toJSON()
      const result = await saveSubscription({
        endpoint: subJSON.endpoint,
        keys: subJSON.keys
      })

      if (result.success) {
        toast.success('Push notifications enabled')
      } else {
        toast.error(result.error || 'Failed to sync subscription')
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to toggle notifications')
    }
    setLoading(false)
  }

  async function handleUnsubscribe() {
    setLoading(true)
    try {
      if (subscription) {
        await subscription.unsubscribe()
        setSubscription(null)
        toast.success('Push notifications disabled on this device')
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to unsubscribe')
    }
    setLoading(false)
  }

  if (!isSupported) {
    return (
      <Card className="glass border-border opacity-50">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-black tracking-tight flex items-center gap-2">
            <LucideBellOff className="h-5 w-5 text-muted-foreground" />
            Push Notifications
          </CardTitle>
          <CardDescription>Not supported on this browser or device.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="glass border-border">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-black tracking-tight flex items-center gap-2">
          {subscription ? (
             <LucideBellRing className="h-5 w-5 text-primary/60" />
          ) : (
             <LucideBellOff className="h-5 w-5 text-muted-foreground" />
          )}
          Push Notifications
        </CardTitle>
        <CardDescription>
          Receive alerts when batches need attention or inventory runs low.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-surface border border-border">
           <div>
             <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Status</p>
             <p className={`text-sm font-bold ${subscription ? 'text-green-400' : 'text-muted-foreground'}`}>
               {subscription ? 'Enabled on this device' : 'Disabled'}
             </p>
           </div>
           
           {subscription ? (
             <Button variant="outline" size="sm" onClick={handleUnsubscribe} disabled={loading} className="text-red-400 border-red-500/20 hover:bg-red-500/10 hover:text-red-300 font-bold">
               {loading ? <LucideLoader2 className="h-4 w-4 animate-spin" /> : 'Disable'}
             </Button>
           ) : (
             <Button size="sm" onClick={handleSubscribe} disabled={loading} className="font-bold">
               {loading ? <LucideLoader2 className="h-4 w-4 animate-spin mr-2" /> : null}
               Enable Push
             </Button>
           )}
        </div>
        
        {subscription && (
          <Button 
            variant="ghost" 
            className="w-full text-xs font-bold text-muted-foreground hover:text-primary transition-colors hover:bg-primary/10"
            onClick={async () => {
              toast.loading('Sending test notification...', { id: 'test-push' })
              const res = await sendTestNotification()
              if (!res.success) toast.error(res.error, { id: 'test-push' })
              else toast.success('Test notification sent', { id: 'test-push' })
            }}
          >
            Send Test Alert
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
