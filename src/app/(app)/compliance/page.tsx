import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  LucideArrowLeft,
  LucideShieldCheck,
  LucideFileWarning,
  LucideCheckCircle2,
  LucidePackageOpen,
  LucideActivity,
  LucideCalculator
} from 'lucide-react'
import { getActiveBrewery } from '@/lib/active-brewery'
import { DailyOperationsForm } from '@/components/DailyOperationsForm'
import { TTBRemarksForm } from '@/components/TTBRemarksForm'
import { validateTTBContinuity } from '@/app/(app)/compliance/actions'

export const metadata = {
  title: 'Compliance & Audit Hub | BrewBrain OS',
}

export default async function CompliancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const brewery = await getActiveBrewery()
  if (!brewery) redirect('/dashboard')

  // Fetch pending shrinkage alerts that need TTB remarks
  const { data: shrinkageAlerts } = await supabase
    .from('shrinkage_alerts')
    .select('*')
    .eq('brewery_id', brewery.id)
    .filter('ttb_reportable', 'is', 'null')
    .limit(10)

  // Fetch recent daily operations
  const { data: recentOperations } = await supabase
    .from('daily_operations_logs')
    .select('*')
    .eq('brewery_id', brewery.id)
    .order('created_at', { ascending: false })
    .limit(5)

  // Validate TTB Continuity
  const today = new Date()
  const { data: vData } = await validateTTBContinuity(today.getMonth() + 1, today.getFullYear())
  const validationSummary = vData || {
    continuityValid: false,
    beginningInventory: 0,
    produced: 0,
    removals: 0,
    returns: 0,
    breakage: 0,
    endingInventoryPredicted: 0,
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-8 pt-8 pb-32 md:pb-8 selection:bg-primary/30">
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        {/* Header */}
        <div className="border-b border-border pb-10">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors mb-4">
            <LucideArrowLeft className="h-3.5 w-3.5" />
            Back to Dashboard
          </Link>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mt-2">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
                <LucideShieldCheck className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tighter text-foreground">Compliance Hub</h1>
                <p className="text-muted-foreground font-medium mt-1">27 CFR 25.292 Operations, Audit Trails, and TTB 5130.9 Form Prep.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Work Area: Column 1 & 2 */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* TTB Continuity Validator */}
            <div className="rounded-2xl border border-border bg-surface overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-emerald-500/5">
                <div className="flex items-center gap-2">
                  <LucideCalculator className="h-4 w-4 text-emerald-400" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">TTB Line 14/33 Continuity Validation (Beta)</p>
                </div>
                {validationSummary.continuityValid ? (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase">
                    <LucideCheckCircle2 className="h-3 w-3" />
                    Balances Match
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[9px] font-black uppercase">
                    <LucideFileWarning className="h-3 w-3" />
                    Warning: Discrepancy Found
                  </div>
                )}
              </div>
              <div className="p-5 flex items-center justify-between gap-4">
                <div className="flex flex-col text-center">
                  <span className="text-muted-foreground text-[10px] uppercase font-bold">Beginning</span>
                  <span className="text-2xl font-black">{validationSummary.beginningInventory}</span>
                </div>
                <span className="text-xl font-black text-muted-foreground">+</span>
                <div className="flex flex-col text-center">
                  <span className="text-muted-foreground text-[10px] uppercase font-bold">Produced</span>
                  <span className="text-2xl font-black text-primary">{validationSummary.produced}</span>
                </div>
                <span className="text-xl font-black text-muted-foreground">-</span>
                <div className="flex flex-col text-center">
                  <span className="text-muted-foreground text-[10px] uppercase font-bold">Removals</span>
                  <span className="text-2xl font-black text-orange-400">{validationSummary.removals}</span>
                </div>
                <span className="text-xl font-black text-muted-foreground">=</span>
                <div className="flex flex-col text-center">
                  <span className="text-muted-foreground text-[10px] uppercase font-bold">Predicted End</span>
                  <span className="text-2xl font-black text-emerald-400">{validationSummary.endingInventoryPredicted}</span>
                </div>
              </div>
              <div className="px-5 pb-5 pt-0 border-t border-border/50 text-xs text-muted-foreground mt-2 pt-3">
                <p>Ensure that all removals, shrinkage, returns, and breakages are properly documented below to maintain continuity.</p>
              </div>
            </div>

            {/* Daily Operations Logger */}
            <div className="rounded-2xl border border-border bg-surface overflow-hidden">
               <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                 <LucideActivity className="h-4 w-4 text-primary" />
                 <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Daily Operations Logger (27 CFR 25.292)</p>
               </div>
               <div className="p-5">
                 <p className="text-sm text-foreground/70 mb-6">File daily transactions such as bottling, breakages, or returning products.</p>
                 <DailyOperationsForm />
               </div>
            </div>

          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 overflow-hidden">
               <div className="px-5 py-4 border-b border-rose-500/20 flex items-center gap-2">
                 <LucideFileWarning className="h-4 w-4 text-rose-400" />
                 <p className="text-[10px] font-black uppercase tracking-widest text-rose-400">Action Required: Form 5130.9 Items</p>
               </div>
               <div className="p-5 text-sm">
                 <p className="text-foreground/80 font-medium mb-4">Shrinkage alerts detected that require compliance remarks for TTB reporting.</p>
                 
                 {shrinkageAlerts && shrinkageAlerts.length > 0 ? (
                    <div className="space-y-3">
                      {shrinkageAlerts.map(alert => (
                        <div key={alert.id} className="p-3 bg-black/40 rounded-lg border border-border">
                           <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-black text-rose-300">Loss: {alert.loss_amount}</span>
                              <span className="text-[9px] uppercase tracking-widest text-muted-foreground">{new Date(alert.detected_at).toLocaleDateString()}</span>
                           </div>
                           <p className="text-xs text-muted-foreground line-clamp-2 mb-3">Found discrepancy requiring your explanation for line 32 (Shortages/Losses).</p>
                           <TTBRemarksForm alertId={alert.id} />
                        </div>
                      ))}
                    </div>
                 ) : (
                    <div className="flex flex-col items-center justify-center p-6 text-center">
                       <LucideCheckCircle2 className="h-8 w-8 text-emerald-400/50 mb-2" />
                       <p className="text-emerald-400/80 font-bold">All caught up!</p>
                       <p className="text-xs text-emerald-400/60 mt-1">No missing TTB remarks.</p>
                    </div>
                 )}
               </div>
            </div>

            <div className="rounded-2xl border border-border bg-surface overflow-hidden">
               <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                 <LucidePackageOpen className="h-4 w-4 text-muted-foreground" />
                 <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Recent Logged Activity</p>
               </div>
               <div className="p-5">
                 {recentOperations && recentOperations.length > 0 ? (
                    <div className="space-y-3">
                       {recentOperations.map(op => (
                         <div key={op.id} className="flex justify-between items-center border-b border-border/50 pb-2 last:border-0 last:pb-0">
                           <div>
                             <p className="text-xs font-bold text-foreground capitalize flex gap-2">
                               {op.operation_type.replace(/_/g, ' ')}
                               {op.ttb_reportable && <span className="text-[8px] bg-primary/20 text-primary px-1.5 rounded uppercase">TTB</span>}
                             </p>
                             <p className="text-[9px] text-muted-foreground font-mono mt-0.5">{op.quantity} {op.unit.toUpperCase()} | IP Logged</p>
                           </div>
                           <span className="text-[10px] text-muted-foreground font-mono">{new Date(op.created_at).toLocaleDateString()}</span>
                         </div>
                       ))}
                    </div>
                 ) : (
                    <p className="text-xs text-muted-foreground text-center">No recent operations logged.</p>
                 )}
               </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}
