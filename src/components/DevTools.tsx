'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { 
  LucideSettings, LucideX, LucideLoader2, LucideCheck, LucideZap, 
  LucideDatabase, LucideBell, LucideHistory, LucideFlaskConical,
  LucideWifiOff, LucideTrash2, LucideChevronRight, LucideContainer, LucideBoxes
} from 'lucide-react'
import { toast } from 'sonner'
import { setDevSubscriptionTier, seedScenario, nuclearReset } from '@/app/(app)/dev-actions'
import { sendTestNotification } from '@/app/actions/push-actions'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

interface DevToolsProps {
  activeBreweryId: string | null
  currentTier: string
}

interface ActionLog {
  id: string
  name: string
  status: 'pending' | 'success' | 'error'
  timestamp: number
  message?: string
}

const TIER_OPTIONS = [
  { value: 'free', label: 'Free Tier', desc: 'Baseline limits' },
  { value: 'nano', label: 'Nano Tier', desc: '5 Tanks, 10 Batches' },
  { value: 'production', label: 'Production Tier', desc: 'AI Logs, TTB Reports' },
  { value: 'multi_site', label: 'Multi-Site Tier', desc: 'Unlimited Sites' },
]

const SCENARIOS = [
  { id: 'fermentation', label: 'Active Fermentation', icon: LucideFlaskConical, desc: 'Seeds batch with gravity logs' },
  { id: 'vessels', label: 'Stocked Vessels', icon: LucideContainer, desc: 'Creates 4 tanks with mixed states' },
  { id: 'inventory_full', label: 'Inventory Restock', icon: LucideBoxes, desc: 'Adds Malt, Hops, and Yeast' },
  { id: 'alerts', label: 'Critical Alerts', icon: LucideBell, desc: 'Seeds data needing attention' },
  { id: 'inventory_empty', label: 'Empty Inventory', icon: LucideDatabase, desc: 'Clears all inventory items' },
] as const

type Tab = 'scenarios' | 'tiers' | 'settings'

export function DevTools({ activeBreweryId, currentTier }: DevToolsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('scenarios')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [, startTransition] = useTransition()
  const [actions, setActions] = useState<ActionLog[]>([])
  const [isSlowNetwork, setIsSlowNetwork] = useState(false)
  const [confirmNuclear, setConfirmNuclear] = useState(false)
  const router = useRouter()
  const idCounter = useRef(0)

  // Load persistence
  useEffect(() => {
    const saved = localStorage.getItem('ov-actions')
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved) setActions(JSON.parse(saved).slice(0, 50))
    
    const slow = localStorage.getItem('ov-slow-network')
    if (slow) setIsSlowNetwork(JSON.parse(slow))
  }, [])

  // Save persistence
  useEffect(() => {
    localStorage.setItem('ov-actions', JSON.stringify(actions))
  }, [actions])

  useEffect(() => {
    localStorage.setItem('ov-slow-network', JSON.stringify(isSlowNetwork))
  }, [isSlowNetwork])

  if (process.env.NODE_ENV !== 'development') return null
  if (!activeBreweryId) return null

  const logAction = (name: string, status: ActionLog['status'], message?: string, id?: string) => {
    const actionId = id || `dev-${++idCounter.current}`
    setActions(prev => {
      const existing = prev.find(a => a.id === actionId)
      if (existing) {
        return prev.map(a => a.id === actionId ? { ...a, status, message, timestamp: Date.now() } : a)
      }
      return [{
        id: actionId,
        name,
        status,
        timestamp: Date.now(),
        message
      }, ...prev].slice(0, 50)
    })
    return actionId
  }

  const runDevAction = async (name: string, actionFn: () => Promise<{ success?: boolean; message?: string; error?: string } | boolean | void>) => {
    const actionId = logAction(name, 'pending')
    const toastId = toast.loading(`${name}...`, { position: 'top-center' })
    if (isSlowNetwork) await new Promise(r => setTimeout(r, 1500))
    
    try {
      const res = await actionFn()
      const resObj = typeof res === 'object' && res !== null ? res : null
      const isSuccess = res === true || (resObj && resObj.success !== false)
      
      if (isSuccess) {
        logAction(name, 'success', resObj?.message, actionId)
        toast.success(resObj?.message || `${name} successful`, { id: toastId })
        router.refresh()
      } else {
        logAction(name, 'error', resObj?.error, actionId)
        toast.error(resObj?.error || 'Action failed', { id: toastId, duration: 5000 })
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'System crash during action'
      logAction(name, 'error', msg, actionId)
      toast.error(msg, { id: toastId })
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-[100] font-sans">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="h-12 w-12 rounded-2xl bg-purple-600 shadow-2xl shadow-purple-600/40 flex items-center justify-center hover:scale-105 active:scale-95 transition-all group"
        >
          <LucideSettings className="h-6 w-6 text-foreground group-hover:rotate-45 transition-transform duration-500" />
          <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-background animate-pulse" />
        </button>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="w-[380px] bg-popover/95 backdrop-blur-2xl border border-border rounded-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 bg-gradient-to-br from-purple-500/10 to-transparent border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-purple-600 flex items-center justify-center">
                <LucideZap className="h-4 w-4 text-foreground fill-foreground" />
              </div>
              <div>
                <h3 className="text-sm font-black text-foreground uppercase tracking-wider">Overdrive</h3>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">Enterprise Dev Suite</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="h-8 w-8 rounded-lg hover:bg-secondary flex items-center justify-center transition-colors">
              <LucideX className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Tabs Navigation */}
          <div className="flex px-2 py-2 gap-1 border-b border-border">
            {[
              { id: 'scenarios', label: 'Scenarios', icon: LucideFlaskConical },
              { id: 'tiers', label: 'Subscription', icon: LucideZap },
              { id: 'settings', label: 'Settings & Logs', icon: LucideHistory }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase transition-all",
                  activeTab === tab.id ? "bg-secondary/50 text-foreground shadow-inner" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <tab.icon className={cn("h-3.5 w-3.5", activeTab === tab.id ? "text-purple-400" : "text-muted-foreground")} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="p-4 h-[400px] overflow-y-auto custom-scrollbar">
            <AnimatePresence mode="wait">
              {activeTab === 'scenarios' && (
                <motion.div
                  key="scenarios"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-3"
                >
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Target Scenarios</label>
                  {SCENARIOS.map(scenario => (
                    <button
                      key={scenario.id}
                      onClick={() => runDevAction(`Seed: ${scenario.label}`, () => seedScenario(activeBreweryId, scenario.id))}
                      className="group w-full flex items-center gap-4 p-3 rounded-2xl bg-surface-hover border border-border hover:border-purple-500/50 hover:bg-purple-500/5 transition-all text-left"
                    >
                      <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center group-hover:bg-purple-500/20 group-hover:text-purple-400 transition-colors">
                        <scenario.icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-black text-foreground">{scenario.label}</p>
                        <p className="text-[10px] text-muted-foreground font-bold">{scenario.desc}</p>
                      </div>
                      <LucideChevronRight className="h-4 w-4 text-foreground group-hover:text-purple-500 transition-colors" />
                    </button>
                  ))}
                  
                  <div className="pt-4 space-y-3 border-t border-border">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Live Notifications</label>
                    <button
                      onClick={() => runDevAction('Test Push Notification', () => sendTestNotification())}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:bg-orange-500/20 transition-all font-black text-[10px] uppercase tracking-widest"
                    >
                      <LucideBell className="h-4 w-4 fill-orange-400/20" />
                      Trigger Test Push
                    </button>
                  </div>
                </motion.div>
              )}

              {activeTab === 'tiers' && (
                <motion.div
                  key="tiers"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Pricing Override</label>
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                      Active: {currentTier}
                    </span>
                  </div>
                  <div className="grid gap-2">
                    {TIER_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => runDevAction(`Set Tier: ${opt.label}`, () => setDevSubscriptionTier(activeBreweryId, opt.value))}
                        className={cn(
                          "w-full flex items-center gap-4 p-3 rounded-2xl border transition-all text-left",
                          currentTier === opt.value 
                            ? "bg-purple-500/10 border-purple-500/50 text-foreground" 
                            : "bg-surface border-border text-muted-foreground hover:bg-surface-active"
                        )}
                      >
                        <div className={cn(
                          "h-10 w-10 rounded-xl flex items-center justify-center font-black text-xs",
                          currentTier === opt.value ? "bg-purple-500/20 text-purple-400" : "bg-secondary text-muted-foreground"
                        )}>
                          {opt.label.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-black">{opt.label}</p>
                          <p className="text-[10px] text-muted-foreground font-bold">{opt.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === 'settings' && (
                <motion.div
                   key="settings"
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   className="space-y-6"
                >
                  {/* Performance */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Network Simulation</label>
                    <button
                      onClick={() => setIsSlowNetwork(!isSlowNetwork)}
                      className={cn(
                        "w-full flex items-center justify-between p-3 rounded-2xl border transition-all",
                        isSlowNetwork ? "bg-yellow-500/10 border-yellow-500/50" : "bg-surface-hover border-border"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <LucideWifiOff className={cn("h-4 w-4", isSlowNetwork ? "text-yellow-500" : "text-muted-foreground")} />
                        <span className={cn("text-xs font-black", isSlowNetwork ? "text-yellow-600 dark:text-yellow-200" : "text-muted-foreground")}>Slow Network Mode</span>
                      </div>
                      <div className={cn(
                        "w-10 h-5 rounded-full relative transition-colors",
                        isSlowNetwork ? "bg-yellow-500" : "bg-card"
                      )}>
                        <div className={cn(
                          "absolute top-1 left-1 bottom-1 w-3 rounded-full bg-white transition-all",
                          isSlowNetwork ? "translate-x-5" : "translate-x-0"
                        )} />
                      </div>
                    </button>
                  </div>

                  {/* History */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Active Trace</label>
                      <button onClick={() => setActions([])} className="text-[10px] font-black text-purple-400 hover:text-purple-300">Clear</button>
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {actions.length === 0 ? (
                        <div className="text-center py-4 border-2 border-dashed border-border rounded-2xl">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">No recent actions</p>
                        </div>
                      ) : (
                        actions.map(action => (
                          <div key={action.id} className="flex items-center gap-3 p-2 bg-surface border border-border rounded-xl">
                            {action.status === 'pending' ? <LucideLoader2 className="h-3 w-3 animate-spin text-purple-500" /> : action.status === 'success' ? <LucideCheck className="h-3 w-3 text-green-500" /> : <LucideX className="h-3 w-3 text-red-500" />}
                            <div className="flex-1 flex items-center justify-between min-w-0">
                               <span className="text-[10px] font-black truncate text-foreground">{action.name}</span>
                               <span className="text-[8px] font-bold text-muted-foreground tabular-nums">{new Date(action.timestamp).toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' })}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Danger Zone */}
                  <div className="pt-4 border-t border-border space-y-3">
                    <label className="text-[10px] font-black text-red-500/50 uppercase tracking-widest pl-1">Danger Zone</label>
                    <button
                      onMouseDown={() => {
                        if (!confirmNuclear) setConfirmNuclear(true)
                        else runDevAction('Nuclear Reset', () => nuclearReset(activeBreweryId))
                      }}
                      onMouseLeave={() => setConfirmNuclear(false)}
                      className={cn(
                        "w-full flex items-center justify-center gap-2 py-3 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest",
                        confirmNuclear ? "bg-red-500 text-white animate-pulse" : "bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20"
                      )}
                    >
                      <LucideTrash2 className="h-4 w-4" />
                      {confirmNuclear ? 'Release to confirm' : 'Nuclear Reset'}
                    </button>
                    <p className="text-[8px] text-center font-bold text-muted-foreground uppercase">Wipes all brewery data permanently</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <div className="px-4 py-3 bg-sidebar border-t border-border flex items-center justify-center gap-4">
             <div className="flex items-center gap-1.5 grayscale opacity-50">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest text-center">Development Mode Override Active</span>
             </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
