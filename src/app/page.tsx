import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LucideShieldCheck, LucideWaves, LucideMic, LucideTrophy } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a] text-zinc-100 font-sans selection:bg-orange-600/30">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b border-zinc-900/50 bg-black/60 px-6 py-4 backdrop-blur-xl md:px-12">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-orange-600 shadow-[0_0_15px_rgba(234,88,12,0.4)] flex items-center justify-center font-bold">B</div>
          <span className="text-xl font-bold tracking-tight">BrewBrain <span className="text-orange-600">OS</span></span>
        </div>
        <Link href="/login">
          <Button variant="ghost" className="text-zinc-400 hover:text-white hover:bg-zinc-900">
            Sign In
          </Button>
        </Link>
      </header>

      {/* Hero Section */}
      <main className="flex-grow pt-32 pb-24 md:pt-48">
        <section className="container mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-900/30 bg-orange-950/20 px-3 py-1 text-xs font-semibold text-orange-500 mb-8 animate-in fade-in slide-in-from-top-4 duration-1000">
            <LucideTrophy size={14} />
            <span>The #1 Workflow Operating System for Craft Breweries</span>
          </div>
          <h1 className="mx-auto max-w-4xl text-5xl font-extrabold leading-[1.1] tracking-tight md:text-7xl lg:text-8xl animate-in fade-in slide-in-from-bottom-8 duration-700">
            Run your brewery from the <span className="text-orange-600 drop-shadow-[0_0_20px_rgba(234,88,12,0.45)]">floor</span>.
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-lg text-zinc-400 md:text-xl animate-in fade-in slide-in-from-bottom-12 duration-1000">
            Ditch the whiteboards and spreadsheets. BrewBrain OS is an offline-first, AI-powered floor engine built to manage inventory, logs, and TTB compliance.
          </p>
          <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row animate-in fade-in slide-in-from-bottom-16 duration-1000">
            <Link href="/login">
              <Button className="h-14 w-full bg-orange-600 px-8 text-lg font-bold hover:bg-orange-700 hover:scale-105 transition-all duration-300 sm:w-auto">
                Launch My Brewery Brain
              </Button>
            </Link>
          </div>
        </section>

        {/* Features Grid */}
        <section className="container mx-auto mt-32 px-6 grid gap-8 md:grid-cols-3 lg:grid-cols-4">
          <FeatureCard 
            icon={<LucideMic className="text-orange-600" />}
            title="Hands-Free Logging"
            description="Record gravity, temperature, and pH with your voice. No wet hands on keyboards."
          />
          <FeatureCard 
            icon={<LucideWaves className="text-orange-600" />}
            title="PWA Offline Mode"
            description="Works in basements and walk-in coolers. Automatically syncs when you reach Wi-Fi."
          />
          <FeatureCard 
            icon={<LucideShieldCheck className="text-orange-600" />}
            title="Compliance Engine"
            description="One-click TTB Form 5130.9 and FSMA reports. No more audit panic."
          />
          <FeatureCard 
            icon={<LucideTrophy className="text-orange-600" />}
            title="Digital Twin Tanks"
            description="Real-time floor state. See exactly what is in FV-04 from anywhere."
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 px-6 py-12 md:px-12">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 rounded bg-zinc-800 flex items-center justify-center font-bold text-xs">B</div>
            <span className="text-sm font-semibold text-zinc-500 italic">"Focus on the beer. We'll handle the brain."</span>
          </div>
          <div className="text-sm text-zinc-600">
            © 2026 BrewBrain Technologies. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="group rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 transition-all hover:border-orange-600/30 hover:bg-zinc-900/60">
      <div className="mb-4 h-12 w-12 rounded-lg bg-zinc-900 flex items-center justify-center border border-zinc-800 group-hover:scale-110 group-hover:bg-orange-950/20 group-hover:border-orange-900/40 transition-all duration-300">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2 group-hover:text-orange-500 transition-colors">{title}</h3>
      <p className="text-zinc-500 leading-relaxed text-sm">{description}</p>
    </div>
  )
}
