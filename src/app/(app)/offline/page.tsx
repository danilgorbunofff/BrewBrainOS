import Link from 'next/link'
import {
  LucideWifiOff, LucideWaves, LucideClipboardList,
  LucidePackageSearch, LucideLayoutDashboard, LucideArrowRight
} from 'lucide-react'
import { RetryButton } from '@/components/RetryButton'

export const metadata = {
  title: 'Offline | BrewBrain OS',
}

const cachedRoutes = [
  { label: 'Dashboard', href: '/dashboard', icon: LucideLayoutDashboard, desc: 'View your brewery overview' },
  { label: 'Vessels', href: '/tanks', icon: LucideWaves, desc: 'Check tank status and readings' },
  { label: 'Batches', href: '/batches', icon: LucideClipboardList, desc: 'Review active batch logs' },
  { label: 'Inventory', href: '/inventory', icon: LucidePackageSearch, desc: 'Browse inventory items' },
]

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#060606] text-zinc-100 flex items-center justify-center p-6 selection:bg-primary/30">
      <div className="max-w-lg w-full space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">

        {/* Icon + Header */}
        <div className="text-center space-y-4">
          <div className="mx-auto h-20 w-20 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <LucideWifiOff className="h-10 w-10 text-red-400" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-white">You&apos;re Offline</h1>
            <p className="text-zinc-500 font-medium mt-2 max-w-sm mx-auto">
              No network connection detected. BrewBrain OS is running in offline mode — cached pages are still available below.
            </p>
          </div>
        </div>

        {/* Cached Routes */}
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 text-center">
            Available Offline
          </p>
          <div className="grid gap-2">
            {cachedRoutes.map((route) => {
              const Icon = route.icon
              return (
                <Link
                  key={route.href}
                  href={route.href}
                  className="flex items-center gap-4 px-5 py-4 rounded-2xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] hover:border-primary/20 transition-all group"
                >
                  <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0 group-hover:bg-primary/10 group-hover:border-primary/20 transition-all">
                    <Icon className="h-5 w-5 text-zinc-500 group-hover:text-primary transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-zinc-300 group-hover:text-white transition-colors">{route.label}</p>
                    <p className="text-xs text-zinc-600 font-medium">{route.desc}</p>
                  </div>
                  <LucideArrowRight className="h-4 w-4 text-zinc-700 group-hover:text-primary transition-colors shrink-0" />
                </Link>
              )
            })}
          </div>
        </div>

        {/* Status Info */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-5 space-y-3">
          <p className="text-xs font-bold text-zinc-400">What happens offline?</p>
          <ul className="space-y-2 text-xs text-zinc-600 font-medium">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Previously visited pages load from cache</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Voice logs are queued and sync when you reconnect</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>New data (tanks, batches) requires an active connection</span>
            </li>
          </ul>
        </div>

        {/* Retry */}
        <div className="text-center">
          <RetryButton />
        </div>

      </div>
    </div>
  )
}
