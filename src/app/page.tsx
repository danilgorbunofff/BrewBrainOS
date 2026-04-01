import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  LucideShieldCheck, LucideWaves, LucideMic, LucideQrCode,
  LucideBarChart3, LucideWifi, LucideCheck, LucideArrowRight,
  LucideZap, LucideSmartphone, LucideBrain, LucideStar
} from 'lucide-react'
import { ScrollReveal } from '@/components/ScrollReveal'
import { CookieConsent } from '@/components/CookieConsent'

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#030303] text-zinc-100 font-sans selection:bg-orange-600/30 overflow-x-hidden">

      {/* ─── HEADER ─── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#030303]/80 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl overflow-hidden shadow-[0_0_20px_rgba(234,88,12,0.4)] flex items-center justify-center">
              <img src="/logo.png" alt="BrewBrain Logo" className="h-full w-full object-cover" />
            </div>
            <span className="text-xl font-black tracking-tight">BrewBrain <span className="text-orange-500">OS</span></span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-bold text-zinc-500">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="text-zinc-400 hover:text-white hidden sm:inline-flex">
                Sign In
              </Button>
            </Link>
            <Link href="/login">
              <Button className="bg-orange-600 hover:bg-orange-700 font-bold shadow-[0_0_20px_rgba(234,88,12,0.2)]">
                Start Free Trial
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ─── HERO ─── */}
      <section className="relative pt-32 pb-20 md:pt-44 md:pb-32">
        {/* Ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-orange-600/8 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-20 -left-32 w-[400px] h-[400px] bg-orange-900/10 rounded-full blur-[100px] pointer-events-none animate-blob" />
        <div className="absolute top-40 -right-32 w-[400px] h-[400px] bg-orange-900/5 rounded-full blur-[100px] pointer-events-none animate-blob animation-delay-2000" />

        <div className="relative max-w-7xl mx-auto px-6 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-900/30 bg-orange-950/30 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-orange-400 mb-8 animate-in fade-in slide-in-from-top-4 duration-1000">
            <LucideZap className="h-3.5 w-3.5" />
            Built for the Brewery Floor
          </div>

          {/* Headline */}
          <h1 className="mx-auto max-w-5xl text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-[0.95] tracking-tighter animate-in fade-in slide-in-from-bottom-8 duration-700">
            Stop managing your brewery
            <br className="hidden sm:block" />
            <span className="text-orange-500 drop-shadow-[0_0_30px_rgba(234,88,12,0.4)]"> from a whiteboard.</span>
          </h1>

          {/* Sub-headline */}
          <p className="mx-auto mt-8 max-w-2xl text-lg md:text-xl text-zinc-400 font-medium leading-relaxed animate-in fade-in slide-in-from-bottom-12 duration-1000">
            BrewBrain OS is the AI-powered production platform that replaces spreadsheets, clipboards, and guesswork with
            <span className="text-white font-bold"> one voice command.</span>
          </p>

          {/* CTA */}
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-16 duration-1000">
            <Link href="/login">
              <Button className="h-14 px-10 text-lg font-black bg-orange-600 hover:bg-orange-500 hover:scale-105 transition-all duration-300 shadow-[0_0_40px_rgba(234,88,12,0.3)] hover:shadow-[0_0_60px_rgba(234,88,12,0.4)]">
                Start Free — No Credit Card
                <LucideArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button variant="outline" className="h-14 px-8 text-lg font-bold border-white/10 text-zinc-400 hover:text-white hover:border-white/20">
                See How It Works
              </Button>
            </a>
          </div>

          {/* Social Proof Micro */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-zinc-600 font-medium animate-in fade-in duration-1000">
            <span className="flex items-center gap-1.5">
              <LucideCheck className="h-4 w-4 text-green-500" /> 14-day free trial
            </span>
            <span className="flex items-center gap-1.5">
              <LucideCheck className="h-4 w-4 text-green-500" /> Works offline
            </span>
            <span className="flex items-center gap-1.5">
              <LucideCheck className="h-4 w-4 text-green-500" /> TTB/FSMA compliant
            </span>
          </div>

          {/* ─── LIVE PRODUCT PREVIEW ─── */}
          <ScrollReveal direction="up" distance={60} delay={0.2}>
            <div className="mt-80 text-center mb-12">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-500 mb-4">THE DASHBOARD</p>
              <h2 className="text-3xl md:text-5xl font-black tracking-tighter">Your entire brewery, <br className="sm:hidden" /> in your pocket.</h2>
              <p className="mt-4 text-zinc-500 font-medium max-w-xl mx-auto">Real-time floor state, tank levels, and batch history. Zero latency, even in the cold room.</p>
            </div>
            <div className="relative mx-auto max-w-5xl">
              <div className="absolute -inset-4 bg-gradient-to-b from-orange-600/10 to-transparent rounded-3xl blur-2xl pointer-events-none" />
              <div className="relative rounded-2xl border border-white/10 overflow-hidden shadow-2xl shadow-black/50 bg-[#060606]">
              
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-4 py-3 bg-[#0a0a0a] border-b border-white/5">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-zinc-800" />
                  <div className="h-3 w-3 rounded-full bg-zinc-800" />
                  <div className="h-3 w-3 rounded-full bg-zinc-800" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-zinc-900 rounded-lg h-6 flex items-center px-3 max-w-xs mx-auto">
                    <span className="text-[10px] text-zinc-600 font-mono">app.brewbrain.io/dashboard</span>
                  </div>
                </div>
              </div>

              <div className="flex">
                {/* Sidebar */}
                <div className="hidden md:flex flex-col w-[200px] bg-[#060606] border-r border-white/5 p-4 shrink-0">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="h-7 w-7 rounded-lg overflow-hidden shadow-[0_0_12px_rgba(234,88,12,0.3)] flex items-center justify-center">
                      <img src="/logo.png" alt="BrewBrain Logo" className="h-full w-full object-cover" />
                    </div>
                    <span className="text-sm font-black text-white">BrewBrain <span className="text-orange-500 text-[10px]">OS</span></span>
                  </div>
                  <div className="px-2.5 py-2 rounded-lg bg-white/[0.02] border border-white/5 mb-4">
                    <p className="text-[8px] font-black uppercase tracking-widest text-zinc-700">Active Brewery</p>
                    <p className="text-xs font-bold text-zinc-400 truncate">Copper Trail Brewing</p>
                  </div>
                  <div className="space-y-1">
                    {[
                      { name: 'Dashboard', active: true },
                      { name: 'Vessels', active: false },
                      { name: 'Batches', active: false },
                      { name: 'Inventory', active: false },
                      { name: 'QR Scan', active: false },
                      { name: 'Reports', active: false },
                    ].map(nav => (
                      <div key={nav.name} className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-bold ${nav.active ? 'bg-orange-600/10 text-orange-400 border border-orange-600/20' : 'text-zinc-600'}`}>
                        <div className={`h-1.5 w-1.5 rounded-full ${nav.active ? 'bg-orange-500' : 'bg-zinc-800'}`} />
                        {nav.name}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Main Content — exact replica of real dashboard */}
                <div className="flex-1 p-5 md:p-6 space-y-4">

                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl md:text-2xl font-black tracking-tighter text-white">
                        Brewery <span className="text-orange-500 italic">Brain</span>
                      </h2>
                      <p className="text-[10px] text-zinc-600 font-medium mt-0.5">Welcome back. Copper Trail Brewing is online.</p>
                    </div>
                  </div>

                  {/* KPI Cards — same as real dashboard */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'Active Batches', value: '4', accent: true },
                      { label: 'Tanks in Use', value: '7/12', accent: true },
                      { label: 'Fermenting', value: '3', accent: true },
                      { label: 'Low Stock', value: '2', danger: true },
                    ].map(kpi => (
                      <div key={kpi.label} className={`rounded-2xl p-4 border ${kpi.danger ? 'border-red-500/20 bg-red-500/[0.03]' : 'border-white/5 bg-white/[0.02]'}`}>
                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-2">{kpi.label}</p>
                        <p className={`text-3xl font-black tracking-tighter ${kpi.danger ? 'text-red-400' : kpi.accent ? 'text-orange-400' : 'text-zinc-500'}`}>
                          {kpi.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Production Table + Gravity Chart — same grid as real dashboard */}
                  <div className="grid md:grid-cols-5 gap-4">
                    {/* Current Production */}
                    <div className="md:col-span-3 rounded-2xl border border-white/5 bg-white/[0.01] overflow-hidden">
                      <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Current Production</p>
                        <span className="text-[10px] text-zinc-700 font-bold">View All →</span>
                      </div>
                      <div className="divide-y divide-white/5">
                        {[
                          { id: '#B240', name: 'Hazy IPA', status: 'Fermenting', color: 'text-orange-400 bg-orange-400/10 border-orange-400/20', og: '1.065' },
                          { id: '#B241', name: 'Stout', status: 'Conditioning', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20', og: '1.072' },
                          { id: '#B239', name: 'Pale Ale', status: 'Packaging', color: 'text-purple-400 bg-purple-400/10 border-purple-400/20', og: '1.052' },
                          { id: '#B242', name: 'Lager', status: 'Fermenting', color: 'text-orange-400 bg-orange-400/10 border-orange-400/20', og: '1.048' },
                        ].map(batch => (
                          <div key={batch.id} className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors">
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-mono text-zinc-700">{batch.id}</span>
                              <span className="text-sm font-bold text-zinc-300">{batch.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-mono text-zinc-600">{batch.og}</span>
                              <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${batch.color}`}>
                                {batch.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Gravity Trend — same structure as real dashboard */}
                    <div className="md:col-span-2 rounded-2xl border border-white/5 bg-white/[0.01] p-5 flex flex-col">
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4">Gravity Trend — Hazy IPA</p>
                      <div className="flex-1 flex items-end gap-[3px] min-h-[100px]">
                        {[65, 58, 52, 44, 38, 33, 28, 24, 20, 18, 16, 14, 13, 12].map((val, i) => (
                          <div
                            key={i}
                            className="flex-1 rounded-t-sm bg-orange-500/60 hover:bg-orange-400 transition-colors"
                            style={{ height: `${(val / 65) * 100}%`, minHeight: '3px' }}
                            title={`1.0${val.toString().padStart(2, '0')}`}
                          />
                        ))}
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-[9px] font-mono text-zinc-700">Day 1</span>
                        <span className="text-[9px] font-mono text-orange-500/70">1.012 current</span>
                        <span className="text-[9px] font-mono text-zinc-700">Latest</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Grid: Low Stock + Quick Actions — same as real dashboard */}
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Low Stock */}
                    <div className="rounded-2xl border border-white/5 bg-white/[0.01] overflow-hidden">
                      <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2">
                        <div className="h-3.5 w-3.5 rounded-full bg-red-400/20 flex items-center justify-center">
                          <div className="h-1.5 w-1.5 rounded-full bg-red-400" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Low Stock Alerts</p>
                      </div>
                      <div className="p-4 space-y-2">
                        {[
                          { name: 'Cascade Hops', type: 'Hops', stock: '2', unit: 'lbs' },
                          { name: 'US-05 Yeast', type: 'Yeast', stock: '1', unit: 'packs' },
                        ].map(item => (
                          <div key={item.name} className="flex items-center justify-between p-3 rounded-xl bg-red-500/[0.03] border border-red-500/10">
                            <div>
                              <p className="font-bold text-xs text-zinc-300">{item.name}</p>
                              <p className="text-[9px] text-zinc-600 font-black uppercase">{item.type}</p>
                            </div>
                            <span className="text-sm font-mono font-black text-red-400">
                              {item.stock} <span className="text-[9px] text-zinc-600 font-sans">{item.unit}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="rounded-2xl border border-white/5 bg-white/[0.01] overflow-hidden">
                      <div className="px-5 py-3 border-b border-white/5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Quick Actions</p>
                      </div>
                      <div className="p-3 space-y-1">
                        {[
                          { label: 'Vessels', desc: '12 registered' },
                          { label: 'Batches', desc: '4 active' },
                          { label: 'Inventory', desc: '2 alerts' },
                        ].map(action => (
                          <div key={action.label} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all group">
                            <div className="h-8 w-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center">
                              <div className="h-3 w-3 rounded bg-zinc-700" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-bold text-zinc-400">{action.label}</p>
                              <p className="text-[10px] text-zinc-700">{action.desc}</p>
                            </div>
                            <span className="text-zinc-800 text-xs">→</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Gradient fade */}
              <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#030303] to-transparent pointer-events-none" />
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>

      {/* ─── PAIN → SOLUTION ─── */}
      <section className="py-24 border-t border-white/5">
        <ScrollReveal>
          <div className="max-w-5xl mx-auto px-6 text-center">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-500 mb-4">THE PROBLEM</p>
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter max-w-3xl mx-auto">
              Your brewery runs on <span className="text-zinc-500 line-through decoration-red-500/60">paper, memory, and spreadsheets</span>
            </h2>
            <p className="mt-6 text-zinc-500 font-medium max-w-2xl mx-auto text-lg leading-relaxed">
              Every day, critical production data gets lost — scribbled on whiteboards, forgotten in walk-in coolers, 
              or buried in a spreadsheet nobody updates. Until TTB audit season, when it becomes a three-day panic.
            </p>
          </div>
        </ScrollReveal>

        <div className="max-w-5xl mx-auto px-6 mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { emoji: '📋', problem: 'Handwritten logs get wet, lost, or unreadable', stat: '40%', desc: 'of manual data is never digitized' },
            { emoji: '🧊', problem: 'No signal in the cold room or basement', stat: '0 bars', desc: 'where most readings happen' },
            { emoji: '😰', problem: 'TTB & FSMA audits cause 72-hour fire drills', stat: '$5,000+', desc: 'average cost of a compliance error' },
          ].map((item, i) => (
            <ScrollReveal key={item.stat} delay={i * 0.1}>
              <div className="rounded-2xl border border-red-500/10 bg-red-500/[0.02] p-8 text-center h-full">
                <span className="text-4xl mb-4 block">{item.emoji}</span>
                <p className="text-white font-bold text-base mb-3 leading-tight">{item.problem}</p>
                <p className="text-5xl font-black text-red-400 tracking-tighter leading-none my-2">{item.stat}</p>
                <p className="text-sm text-zinc-500 font-medium px-4">{item.desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" className="py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <ScrollReveal>
            <div className="text-center mb-20">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-500 mb-4">FEATURES</p>
              <h2 className="text-3xl md:text-5xl font-black tracking-tighter">
                Everything your brewery needs.<br className="hidden sm:block" />
                <span className="text-zinc-500">Nothing it doesn&apos;t.</span>
              </h2>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: LucideMic,
                title: 'Voice-Powered Logging',
                description: 'Tap the mic, say "Batch 402, 68 degrees, gravity 1.012." AI extracts the data and writes it to your database. No keyboards, no wet hands.',
                highlight: true,
              },
              {
                icon: LucideQrCode,
                title: 'QR Tank Scanning',
                description: 'Stick a waterproof QR code on every tank. Scan with your phone to instantly pull up batch info, log sanitation, or record a reading.',
              },
              {
                icon: LucideWifi,
                title: 'Offline-First PWA',
                description: 'Works in basements, cold rooms, and walk-in coolers with zero signal. Syncs automatically when you\'re back online.',
              },
              {
                icon: LucideShieldCheck,
                title: 'Compliance Autopilot',
                description: 'TTB Form 5130.9, FSMA sanitation logs — generated automatically from your production data. One-click export for audits.',
              },
              {
                icon: LucideWaves,
                title: 'Digital Twin Tanks',
                description: 'See exactly what\'s in FV-04 from your couch. Real-time floor state with batch assignment, capacity, and reading history.',
              },
              {
                icon: LucideBarChart3,
                title: 'Live Dashboards',
                description: 'Active batches, tanks in use, low-stock alerts, gravity trends — all in one place. Know your floor state at a glance.',
              },
            ].map((feature, i) => (
              <ScrollReveal key={feature.title} delay={i * 0.1}>
                <div
                  className={`group h-full relative rounded-2xl border p-8 transition-all duration-500 ${
                    feature.highlight
                      ? 'border-orange-600/30 bg-orange-600/[0.03] hover:bg-orange-600/[0.06] hover:border-orange-500/40 shadow-[0_0_40px_rgba(234,88,12,0.05)]'
                      : 'border-white/5 bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/10'
                  }`}
                >
                  {feature.highlight && (
                    <span className="absolute top-4 right-4 text-[9px] font-black uppercase tracking-widest text-orange-500 bg-orange-500/10 px-2.5 py-1 rounded-full border border-orange-500/20">
                      AI Powered
                    </span>
                  )}
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center mb-5 border transition-all duration-300 group-hover:scale-110 ${
                    feature.highlight
                      ? 'bg-orange-600/10 border-orange-600/20'
                      : 'bg-white/5 border-white/5 group-hover:bg-orange-600/10 group-hover:border-orange-600/20'
                  }`}>
                    <feature.icon className={`h-5 w-5 ${feature.highlight ? 'text-orange-500' : 'text-zinc-500 group-hover:text-orange-500 transition-colors'}`} />
                  </div>
                  <h3 className="text-xl font-black tracking-tight mb-2 group-hover:text-orange-400 transition-colors">{feature.title}</h3>
                  <p className="text-zinc-500 text-sm leading-relaxed font-medium">{feature.description}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how-it-works" className="py-24 border-t border-white/5">
        <div className="max-w-5xl mx-auto px-6">
          <ScrollReveal>
            <div className="text-center mb-20">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-500 mb-4">HOW IT WORKS</p>
              <h2 className="text-3xl md:text-5xl font-black tracking-tighter">
                Three steps. Five minutes.
              </h2>
              <p className="text-zinc-500 font-medium mt-4 max-w-lg mx-auto">You&apos;ll be logging readings before your yeast finishes proofing.</p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                icon: LucideSmartphone,
                title: 'Sign Up & Name Your Brewery',
                description: 'Create your account and register your facility. Takes 30 seconds. No credit card needed.',
              },
              {
                step: '02',
                icon: LucideQrCode,
                title: 'Add Tanks & Print QR Labels',
                description: 'Register each vessel. We generate waterproof QR stickers that link directly to each tank\'s dashboard.',
              },
              {
                step: '03',
                icon: LucideBrain,
                title: 'Start Logging with AI',
                description: 'Tap the mic, speak your reading, and our AI parses it into structured data. It\'s that simple.',
              },
            ].map((item, i) => (
              <ScrollReveal key={item.step} delay={i * 0.2}>
                <div className="relative">
                  {i < 2 && (
                    <div className="hidden md:block absolute top-7 left-1/2 w-[calc(100%+2rem)] h-px bg-gradient-to-r from-orange-600/30 to-transparent z-0" />
                  )}
                  <div className="text-center space-y-4 relative z-10">
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#030303] border border-orange-600/20 shadow-[0_0_20px_rgba(234,88,12,0.1)]">
                      <item.icon className="h-6 w-6 text-orange-500" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-400">Step {item.step}</p>
                    <h3 className="text-xl font-black tracking-tight">{item.title}</h3>
                    <p className="text-zinc-500 text-sm leading-relaxed font-medium">{item.description}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIAL / SOCIAL PROOF ─── */}
      <section className="py-24 border-t border-white/5 bg-orange-600/[0.015]">
        <ScrollReveal>
          <div className="max-w-4xl mx-auto px-6 text-center">
            <div className="flex justify-center gap-1 mb-6">
              {[1,2,3,4,5].map(i => (
                <LucideStar key={i} className="h-5 w-5 fill-orange-500 text-orange-500" />
              ))}
            </div>
            <blockquote className="text-2xl md:text-3xl font-black tracking-tight text-white leading-snug max-w-3xl mx-auto">
              &ldquo;We were running our 15-barrel system on whiteboards and Google Sheets. BrewBrain replaced all of it in one afternoon. TTB reporting went from a 3-day nightmare to one button click.&rdquo;
            </blockquote>
            <div className="mt-8">
              <p className="font-bold text-white">Jake Morrison</p>
              <p className="text-sm text-zinc-500 font-medium">Head Brewer, Copper Trail Brewing Co.</p>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ─── PRICING ─── */}
      <section id="pricing" className="py-24 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollReveal>
            <div className="text-center mb-16">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-500 mb-4">PRICING</p>
              <h2 className="text-3xl md:text-5xl font-black tracking-tighter">
                Cheaper than one compliance mistake.
              </h2>
              <p className="text-zinc-500 font-medium mt-4">Start free for 14 days. Cancel anytime.</p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Nano */}
            <ScrollReveal delay={0.1}>
              <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-8 flex flex-col h-full">
                <p className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">Nanobrewery</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-5xl font-black tracking-tighter">$149</span>
                  <span className="text-zinc-600 font-bold">/mo</span>
                </div>
                <p className="text-sm text-zinc-600 font-medium mb-8">Up to 5 tanks. Perfect for taproom brewing.</p>
                <ul className="space-y-3 flex-1 mb-8">
                  {['Up to 5 tanks', 'Inventory tracking', 'QR tank scanning', 'Basic compliance logs', 'Offline-first PWA'].map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-zinc-400 font-medium">
                      <LucideCheck className="h-4 w-4 text-green-500 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/login" className="block">
                  <Button variant="outline" className="w-full border-white/10 font-bold">Start Free Trial</Button>
                </Link>
              </div>
            </ScrollReveal>

            {/* Production — Highlighted */}
            <ScrollReveal delay={0.2}>
              <div className="rounded-2xl border border-orange-600/30 bg-orange-600/[0.03] p-8 flex flex-col relative shadow-[0_0_60px_rgba(234,88,12,0.08)] h-full">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-widest bg-orange-600 text-white px-4 py-1.5 rounded-full">Most Popular</span>
                <p className="text-xs font-black uppercase tracking-widest text-orange-400 mb-2">Production</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-5xl font-black tracking-tighter text-white">$299</span>
                  <span className="text-zinc-500 font-bold">/mo</span>
                </div>
                <p className="text-sm text-zinc-500 font-medium mb-8">Unlimited tanks. Full AI and compliance suite.</p>
                <ul className="space-y-3 flex-1 mb-8">
                  {['Unlimited tanks & batches', 'AI voice logging', 'TTB & FSMA report exports', 'Real-time analytics', 'Priority support', 'White-glove setup included'].map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-zinc-300 font-medium">
                      <LucideCheck className="h-4 w-4 text-orange-500 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/login" className="block">
                  <Button className="w-full bg-orange-600 hover:bg-orange-500 font-bold shadow-[0_0_20px_rgba(234,88,12,0.2)]">Start Free Trial</Button>
                </Link>
              </div>
            </ScrollReveal>

            {/* Multi-Site */}
            <ScrollReveal delay={0.3}>
              <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-8 flex flex-col h-full">
                <p className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">Multi-Site</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-5xl font-black tracking-tighter">$599</span>
                  <span className="text-zinc-600 font-bold">/mo</span>
                </div>
                <p className="text-sm text-zinc-600 font-medium mb-8">Multiple facilities. Regional oversight.</p>
                <ul className="space-y-3 flex-1 mb-8">
                  {['Everything in Production', 'Multi-brewery management', 'Team roles & permissions', 'Supply chain dashboard', 'Dedicated account manager', 'Custom integrations'].map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-zinc-400 font-medium">
                      <LucideCheck className="h-4 w-4 text-green-500 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/login" className="block">
                  <Button variant="outline" className="w-full border-white/10 font-bold">Contact Sales</Button>
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="py-32 border-t border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(234,88,12,0.08),transparent_60%)] pointer-events-none" />
        <ScrollReveal>
          <div className="relative max-w-3xl mx-auto px-6 text-center">
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-6">
              Focus on the beer.<br />
              <span className="text-orange-500">We&apos;ll handle the brain.</span>
            </h2>
            <p className="text-zinc-500 font-medium text-lg max-w-xl mx-auto mb-10">
              Join the breweries that stopped losing data on the floor and started running production like a machine.
            </p>
            <Link href="/login">
              <Button className="h-16 px-12 text-xl font-black bg-orange-600 hover:bg-orange-500 hover:scale-105 transition-all duration-300 shadow-[0_0_50px_rgba(234,88,12,0.3)]">
                Launch My Brewery Brain
                <LucideArrowRight className="ml-3 h-6 w-6" />
              </Button>
            </Link>
          </div>
        </ScrollReveal>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-white/5 px-6 py-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-lg overflow-hidden flex items-center justify-center">
              <img src="/logo.png" alt="BrewBrain Logo" className="h-full w-full object-cover" />
            </div>
            <span className="text-sm font-bold text-zinc-600">BrewBrain OS</span>
          </div>
          <div className="flex items-center gap-8 text-sm text-zinc-700 font-medium">
            <a href="#features" className="hover:text-zinc-400 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-zinc-400 transition-colors">Pricing</a>
            <Link href="/login" className="hover:text-zinc-400 transition-colors">Sign In</Link>
          </div>
          <p className="text-sm text-zinc-800 font-medium">
            © 2026 BrewBrain Technologies
          </p>
        </div>
      </footer>
      <CookieConsent />
    </div>
  )
}
