'use client'

import { useOfflineQueue } from '@/lib/offlineQueue'
import { WifiOff, ShieldCheck, Loader2, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

export function OfflineSyncBanner() {
  const { queueCount, isOnline } = useOfflineQueue()

  if (isOnline && queueCount === 0) return null

  return (
    <div className={cn(
      "w-full py-2 px-4 transition-all duration-500 ease-in-out z-50 fixed top-0 left-0 right-0 flex items-center justify-center gap-2 text-xs font-bold shadow-lg backdrop-blur-xl",
      !isOnline 
        ? "bg-red-500/20 text-red-100 border-b border-red-500/30 shadow-red-500/20" 
        : "bg-primary/20 text-primary-foreground border-b border-primary/30 shadow-primary/20"
    )}>
      {!isOnline ? (
        <>
          <WifiOff className="h-4 w-4 text-red-400" />
          <span className="text-red-400">Offline Mode Active.</span>
          {queueCount > 0 && (
            <span className="ml-1 text-red-200">
              {queueCount} item(s) pending sync.
            </span>
          )}
          <button
            onClick={() => window.location.reload()}
            className="ml-2 px-2.5 py-0.5 rounded-md bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 hover:text-red-100 transition-all flex items-center gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        </>
      ) : (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-primary-foreground">Syncing {queueCount} offline item(s) to BrewBrain...</span>
        </>
      )}
    </div>
  )
}
