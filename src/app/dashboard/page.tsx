import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { LucideClipboardList, LucidePackageSearch, LucideWaves } from 'lucide-react'
import { VoiceLogger } from '@/components/VoiceLogger'
import { setupBrewery } from './actions'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch brewery info
  const { data: brewery } = await supabase
    .from('breweries')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 font-sans p-8 pt-24">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Dashboard Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl lg:text-6xl animate-in fade-in slide-in-from-left-4 duration-700">
              Your <span className="text-orange-600">Brewery Brain</span>
            </h1>
            <p className="text-zinc-500 text-lg md:text-xl">
              Quick access to your production floor operations.
            </p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-4 flex flex-col justify-center animate-in fade-in slide-in-from-right-4 duration-1000">
             <span className="text-xs font-bold text-orange-600 uppercase tracking-widest mb-1">Signed in as</span>
             <span className="text-sm font-medium text-zinc-300 italic">{user.email}</span>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <DashboardCard
            title="Tanks"
            description="Manage your fermentation and conditioning vessels."
            icon={<LucideWaves className="text-orange-600" />}
            href="/tanks"
          />
          <DashboardCard
            title="Inventory"
            description="Track hops, grain, yeast, and adjuncts."
            icon={<LucidePackageSearch className="text-orange-600" />}
            href="/inventory"
          />
          <DashboardCard
            title="Batches"
            description="Log daily readings and check batch progress."
            icon={<LucideClipboardList className="text-orange-600" />}
            href="/batches"
          />
        </div>

        {/* Global Voice Logger */}
        <div className="flex flex-col items-center justify-center py-12 animate-in fade-in slide-in-from-bottom-12 duration-1000">
          <h2 className="text-2xl font-bold mb-6 text-zinc-100">Global Voice Log</h2>
          <VoiceLogger />
        </div>

        {/* Empty State / Welcome Message if No Brewery */}
        {!brewery && (
          <div className="rounded-3xl border-2 border-dashed border-zinc-800 bg-zinc-900/20 p-12 text-center">
            <h2 className="text-2xl font-bold text-zinc-100 mb-2">Configure Your Brewery</h2>
            <p className="text-zinc-500 mb-8 max-w-md mx-auto">You're logged in, but you haven't linked a brewery profile to this account yet. What's the name of your facility?</p>
            
            <form action={setupBrewery} className="flex flex-col md:flex-row items-center justify-center gap-4 max-w-sm mx-auto">
              <Input 
                name="name" 
                placeholder="e.g. Apex Brewing Co." 
                required 
                className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-orange-600"
              />
              <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white font-bold w-full md:w-auto">
                Create
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

function DashboardCard({ title, description, icon, href }: { title: string, description: string, icon: React.ReactNode, href: string }) {
  return (
    <Card className="group border-zinc-800 bg-zinc-900/40 hover:border-orange-600/30 hover:bg-zinc-900/60 transition-all duration-300">
      <CardHeader className="flex flex-row items-center gap-4 pb-2">
        <div className="h-10 w-10 rounded-lg bg-zinc-900 flex items-center justify-center border border-zinc-800 group-hover:scale-110 group-hover:bg-orange-950/20 group-hover:border-orange-900/40 transition-all duration-300">
          {icon}
        </div>
        <CardTitle className="text-2xl font-bold text-zinc-100 group-hover:text-orange-500 transition-colors">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-zinc-500 leading-relaxed text-sm mb-6">{description}</p>
        <a href={href} className="text-sm font-bold text-orange-600 hover:text-orange-500 flex items-center gap-1 group-hover:translate-x-1 transition-all">
          Explore {title}
          <span className="text-lg">→</span>
        </a>
      </CardContent>
    </Card>
  )
}
