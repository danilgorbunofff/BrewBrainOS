import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LucideUser, LucideSettings, LucideBuilding2,
  LucideArrowLeft, LucideMail, LucideShield, LucideLogOut
} from 'lucide-react'
import { ThemeSelector } from '@/components/ThemeSelector'
import { ActivityLog } from '@/components/ActivityLog'

export const metadata = {
  title: 'Settings | BrewBrain OS',
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: brewery } = await supabase
    .from('breweries')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  // Build activity log from recent data
  const activities: { id: string; type: 'batch' | 'tank' | 'reading' | 'inventory'; label: string; detail: string; timestamp: string }[] = []

  if (brewery) {
    const [batchRes, readingRes, tankRes] = await Promise.all([
      supabase.from('batches').select('id, recipe_name, status, created_at')
        .eq('brewery_id', brewery.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('batch_readings').select('id, gravity, temperature, created_at, batch_id')
        .order('created_at', { ascending: false }).limit(5),
      supabase.from('tanks').select('id, name, status, created_at')
        .eq('brewery_id', brewery.id).order('created_at', { ascending: false }).limit(3),
    ])

    for (const b of batchRes.data || []) {
      activities.push({
        id: `b-${b.id}`,
        type: 'batch',
        label: `Batch "${b.recipe_name}"`,
        detail: `Status: ${b.status}`,
        timestamp: b.created_at,
      })
    }

    for (const r of readingRes.data || []) {
      activities.push({
        id: `r-${r.id}`,
        type: 'reading',
        label: 'Voice Reading Logged',
        detail: `Gravity: ${r.gravity || '—'} • Temp: ${r.temperature || '—'}°`,
        timestamp: r.created_at,
      })
    }

    for (const t of tankRes.data || []) {
      activities.push({
        id: `t-${t.id}`,
        type: 'tank',
        label: `Tank "${t.name}" registered`,
        detail: `Status: ${t.status}`,
        timestamp: t.created_at,
      })
    }

    // Sort by timestamp desc
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }

  const email = user.email || ''
  const initials = email.substring(0, 2).toUpperCase()

  return (
    <div className="min-h-screen bg-[#060606] text-zinc-100 p-6 md:p-8 pt-8 selection:bg-primary/30">
      <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">

        {/* Header */}
        <div className="border-b border-white/5 pb-10">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-600 hover:text-primary transition-colors mb-4">
            <LucideArrowLeft className="h-3.5 w-3.5" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-4 mt-2">
            <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
              <LucideSettings className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tighter text-white">Settings Hub</h1>
              <p className="text-zinc-500 font-medium mt-1">Manage your account and brewery preferences.</p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">

          {/* Account Info */}
          <Card className="glass border-white/5">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-black tracking-tight flex items-center gap-2">
                <LucideUser className="h-5 w-5 text-primary/60" />
                Account
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                <div className="h-14 w-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-xl font-black text-primary">{initials}</span>
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-black uppercase tracking-widest text-zinc-600 mb-1">Active Session</p>
                  <p className="font-bold text-zinc-200 truncate">{email}</p>
                  <p className="text-xs font-mono text-zinc-700 mt-0.5">ID: {user.id.slice(0, 16)}…</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <LucideMail className="h-4 w-4 text-zinc-500 shrink-0" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Email</p>
                    <p className="text-sm font-medium text-zinc-300">{email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <LucideShield className="h-4 w-4 text-zinc-500 shrink-0" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Account Status</p>
                    <p className="text-sm font-medium text-green-400">Verified &amp; Active</p>
                  </div>
                </div>
              </div>

              <form action="/api/auth/signout" method="post">
                <Button variant="outline" className="w-full border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300 gap-2 font-bold">
                  <LucideLogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Brewery Info */}
          <Card className="glass border-white/5">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-black tracking-tight flex items-center gap-2">
                <LucideBuilding2 className="h-5 w-5 text-primary/60" />
                Brewery
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {brewery ? (
                <div className="space-y-3">
                  <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-1">Name</p>
                    <p className="text-2xl font-black tracking-tight text-white">{brewery.name}</p>
                  </div>
                  {brewery.license_number && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <LucideShield className="h-4 w-4 text-zinc-500 shrink-0" />
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">License / TTB</p>
                        <p className="text-sm font-mono font-medium text-zinc-300">{brewery.license_number}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <LucideUser className="h-4 w-4 text-zinc-500 shrink-0" />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Brewery ID</p>
                      <p className="text-xs font-mono text-zinc-500">{brewery.id}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center border border-dashed border-white/10 rounded-2xl">
                  <p className="text-zinc-600 font-medium text-sm mb-3">No brewery initialized yet.</p>
                  <Link href="/dashboard">
                    <Button size="sm" className="rounded-xl">Initialize Brewery</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Theme Selector (client component) */}
          <ThemeSelector />

          {/* Activity Log */}
          <ActivityLog activities={activities} />

        </div>

      </div>
    </div>
  )
}
