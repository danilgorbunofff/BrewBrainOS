'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { ScenarioDensity, ScenarioSize, ScenarioTemplateId } from '@/lib/dev-seeder'
import {
  LucideSettings, LucideX, LucideLoader2, LucideCheck, LucideZap,
  LucideDatabase, LucideBell, LucideHistory, LucideFlaskConical,
  LucideWifiOff, LucideTrash2, LucideChevronRight, LucideContainer, LucideBoxes,
  LucideRadio, LucideActivity, LucideTimer, LucideBarChart3,
  LucideTrendingDown, LucideSiren, LucideWifi, LucideCloudOff,
  LucideArchive, LucideRefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { setDevSubscriptionTier, seedScenario, seedRandomScenario, nuclearReset, seedMockBatches } from '@/app/(app)/dev-actions'
import {
  simulateIotReading,
  simulateIotBurst,
  triggerFermentationAlertCron,
  seedLargeDataset,
  seedDegradationScenario,
  seedFermentationAlerts,
} from '@/app/(app)/dev/actions.server'
import { sendTestNotification } from '@/app/actions/push-actions'
import { getOfflineQueue, clearOfflineQueue, enqueueAction, processQueue } from '@/lib/offlineQueue'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Types ──────────────────────────────────────────────────────────────

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

type Tab = 'scenarios' | 'iot' | 'offline' | 'tiers' | 'perf' | 'settings'

// ─── Constants ──────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: typeof LucideZap }[] = [
  { id: 'scenarios', label: 'Seed', icon: LucideFlaskConical },
  { id: 'iot', label: 'IoT', icon: LucideRadio },
  { id: 'offline', label: 'Offline', icon: LucideCloudOff },
  { id: 'tiers', label: 'Tiers', icon: LucideZap },
  { id: 'perf', label: 'Perf', icon: LucideBarChart3 },
  { id: 'settings', label: 'Logs', icon: LucideHistory },
]

const TIER_OPTIONS = [
  { value: 'free', label: 'Free Tier', desc: 'Baseline limits' },
  { value: 'nano', label: 'Nano Tier', desc: '5 Tanks, 10 Batches' },
  { value: 'production', label: 'Production Tier', desc: 'AI Logs, TTB Reports' },
  { value: 'multi_site', label: 'Multi-Site Tier', desc: 'Unlimited Sites' },
]

const SCENARIOS = [
  { id: 'fermentation', label: 'Active Fermentation', icon: LucideFlaskConical, desc: 'Batch + gravity logs' },
  { id: 'vessels', label: 'Stocked Vessels', icon: LucideContainer, desc: '4 tanks mixed states' },
  { id: 'inventory_full', label: 'Inventory Restock', icon: LucideBoxes, desc: 'Malt, Hops, Yeast, Packaging' },
  { id: 'alerts', label: 'Critical Alerts', icon: LucideBell, desc: 'Attention-needing data' },
  { id: 'inventory_empty', label: 'Clear Inventory', icon: LucideDatabase, desc: 'Wipes all inventory' },
] as const

const RANDOM_SCENARIO_TEMPLATES: Array<{ value: ScenarioTemplateId; label: string }> = [
  { value: 'activeFermentation', label: 'Active Fermentation' },
  { value: 'stockedVessels', label: 'Stocked Vessels' },
  { value: 'inventoryRestock', label: 'Inventory Restock' },
  { value: 'criticalAlerts', label: 'Critical Alerts' },
]

const RANDOM_SCENARIO_SIZES: Array<{ value: ScenarioSize; label: string }> = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
]

const RANDOM_SCENARIO_DENSITIES: Array<{ value: ScenarioDensity; label: string }> = [
  { value: 'sparse', label: 'Sparse' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'dense', label: 'Dense' },
]

// ─── Component ──────────────────────────────────────────────────────────

export function DevTools({ activeBreweryId, currentTier }: DevToolsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('scenarios')
  const [actions, setActions] = useState<ActionLog[]>([])
  const [isSlowNetwork, setIsSlowNetwork] = useState(false)
  const [nuclearConfirmText, setNuclearConfirmText] = useState('')
  const router = useRouter()
  const idCounter = useRef(0)

  // IoT form state
  const [iotTemp, setIotTemp] = useState('20.0')
  const [iotGravity, setIotGravity] = useState('1.050')
  const [iotBurstCount, setIotBurstCount] = useState('10')

  // Perf form state
  const [perfBatches, setPerfBatches] = useState('50')
  const [perfReadings, setPerfReadings] = useState('20')

  // Random scenario state
  const [randomSeed, setRandomSeed] = useState('')
  const [randomTemplate, setRandomTemplate] = useState<ScenarioTemplateId>('activeFermentation')
  const [randomSize, setRandomSize] = useState<ScenarioSize>('medium')
  const [randomDensity, setRandomDensity] = useState<ScenarioDensity>('balanced')

  // Offline queue state
  const [queueCount, setQueueCount] = useState(0)
  const [isOnline, setIsOnline] = useState(true)

  // Keyboard shortcut: Ctrl+Shift+D toggles panel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault()
        setIsOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Load persistence
  useEffect(() => {
    const saved = localStorage.getItem('ov-actions')
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved) setActions(JSON.parse(saved).slice(0, 50))
    const slow = localStorage.getItem('ov-slow-network')
    if (slow) setIsSlowNetwork(JSON.parse(slow))
  }, [])

  useEffect(() => {
    localStorage.setItem('ov-actions', JSON.stringify(actions))
  }, [actions])

  useEffect(() => {
    localStorage.setItem('ov-slow-network', JSON.stringify(isSlowNetwork))
  }, [isSlowNetwork])

  // Offline queue polling
  const refreshQueue = useCallback(async () => {
    try {
      const q = await getOfflineQueue()
      setQueueCount(q.length)
    } catch { /* no idb in test */ }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshQueue()
    setIsOnline(navigator.onLine)
    const onOnline = () => setIsOnline(true)
    const onOffline = () => setIsOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [refreshQueue])

  // Expose window.__devFixture for Playwright
  useEffect(() => {
    if (typeof window === 'undefined' || !activeBreweryId) return
    const fixture = {
      seedScenario: (scenario: string) => seedScenario(activeBreweryId, scenario as Parameters<typeof seedScenario>[1]),
      seedRandomScenario: (input?: Parameters<typeof seedRandomScenario>[1]) => seedRandomScenario(activeBreweryId, input),
      seedMockBatches: () => seedMockBatches(activeBreweryId),
      nuclearReset: () => nuclearReset(activeBreweryId),
      simulateIotReading: (payload: Parameters<typeof simulateIotReading>[1]) => simulateIotReading(activeBreweryId, payload),
      simulateIotBurst: (count?: number) => simulateIotBurst(activeBreweryId, count),
      triggerAlertCron: () => triggerFermentationAlertCron(activeBreweryId),
      seedLargeDataset: (opts?: Parameters<typeof seedLargeDataset>[1]) => seedLargeDataset(activeBreweryId, opts),
      seedDegradation: () => seedDegradationScenario(activeBreweryId),
      seedAlerts: () => seedFermentationAlerts(activeBreweryId),
      setTier: (tier: string) => setDevSubscriptionTier(activeBreweryId, tier),
      offlineClear: () => clearOfflineQueue().then(refreshQueue),
      offlineFlush: () => processQueue().then(refreshQueue),
      offlineEnqueueVoice: () => enqueueAction({ type: 'voice-log', payload: new Blob(['test-audio'], { type: 'audio/webm' }) }).then(refreshQueue),
      offlineGetCount: refreshQueue,
    }
    ;(window as Window & { __devFixture?: typeof fixture }).__devFixture = fixture
    return () => { delete (window as Window & { __devFixture?: typeof fixture }).__devFixture }
  }, [activeBreweryId, refreshQueue])

  if (process.env.NODE_ENV !== 'development') return null
  if (!activeBreweryId) return null

  // ─── Action Runner ──────────────────────────────────────────────────

  const logAction = (name: string, status: ActionLog['status'], message?: string, id?: string) => {
    const actionId = id || `dev-${++idCounter.current}`
    setActions(prev => {
      const existing = prev.find(a => a.id === actionId)
      if (existing) {
        return prev.map(a => a.id === actionId ? { ...a, status, message, timestamp: Date.now() } : a)
      }
      return [{ id: actionId, name, status, timestamp: Date.now(), message }, ...prev].slice(0, 50)
    })
    return actionId
  }

  const run = async (name: string, actionFn: () => Promise<{ success?: boolean; message?: string; error?: string } | boolean | void>) => {
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

  const runRandomScenario = async (seedValue?: string) => {
    const normalizedSeed = seedValue?.trim() || undefined
    await run(normalizedSeed ? 'Seed Random Scenario' : 'Seed Unique Scenario', async () => {
      const result = await seedRandomScenario(activeBreweryId, {
        seed: normalizedSeed,
        template: randomTemplate,
        opts: {
          size: randomSize,
          density: randomDensity,
        },
      })

      if (result?.success && result.seed) {
        setRandomSeed(result.seed)
      }

      return result
    })
  }

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <div className="fixed bottom-4 right-4 z-[100] font-sans">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open dev tools"
          className="h-12 w-12 rounded-2xl bg-purple-600 shadow-2xl shadow-purple-600/40 flex items-center justify-center hover:scale-105 active:scale-95 transition-all group"
        >
          <LucideSettings className="h-6 w-6 text-foreground group-hover:rotate-45 transition-transform duration-500" />
          <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-background animate-pulse" />
        </button>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="w-[420px] bg-popover/95 backdrop-blur-2xl border border-border rounded-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] overflow-hidden"
        >
          {/* ── Header ───────────────────────────────────────── */}
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
            <button onClick={() => setIsOpen(false)} aria-label="Close dev tools" className="h-8 w-8 rounded-lg hover:bg-secondary flex items-center justify-center transition-colors">
              <LucideX className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* ── Tab Bar ──────────────────────────────────────── */}
          <div className="flex px-2 py-1.5 gap-0.5 border-b border-border overflow-x-auto scrollbar-none">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[9px] font-black uppercase whitespace-nowrap transition-all",
                  activeTab === tab.id
                    ? "bg-secondary/50 text-foreground shadow-inner"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <tab.icon className={cn("h-3 w-3", activeTab === tab.id ? "text-purple-400" : "text-muted-foreground")} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Content ──────────────────────────────────────── */}
          <div className="p-4 h-[460px] overflow-y-auto custom-scrollbar">
            <AnimatePresence mode="wait">

              {/* ════════════ SEED TAB ════════════ */}
              {activeTab === 'scenarios' && (
                <TabPanel key="scenarios">
                  <SectionLabel>Quick Scenarios</SectionLabel>
                  {SCENARIOS.map(s => (
                    <ScenarioRow
                      key={s.id}
                      icon={s.icon}
                      label={s.label}
                      desc={s.desc}
                      onClick={() => run(`Seed: ${s.label}`, () => seedScenario(activeBreweryId, s.id))}
                    />
                  ))}

                  <SectionLabel className="mt-5">Unique Random Scenario</SectionLabel>
                  <div className="rounded-2xl border border-border bg-surface px-3 py-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <SelectField
                        id="random-template"
                        label="Template"
                        value={randomTemplate}
                        onChange={(value) => setRandomTemplate(value as ScenarioTemplateId)}
                        options={RANDOM_SCENARIO_TEMPLATES}
                      />
                      <InputField
                        id="random-seed"
                        label="Seed"
                        value={randomSeed}
                        onChange={setRandomSeed}
                        placeholder="blank = unique"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <SelectField
                        id="random-size"
                        label="Size"
                        value={randomSize}
                        onChange={(value) => setRandomSize(value as ScenarioSize)}
                        options={RANDOM_SCENARIO_SIZES}
                      />
                      <SelectField
                        id="random-density"
                        label="Density"
                        value={randomDensity}
                        onChange={(value) => setRandomDensity(value as ScenarioDensity)}
                        options={RANDOM_SCENARIO_DENSITIES}
                      />
                    </div>
                    <ActionBtn
                      icon={LucideFlaskConical}
                      label="Generate Scenario"
                      onClick={() => runRandomScenario(randomSeed)}
                    />
                    <MiniAction
                      icon={LucideRefreshCw}
                      label="Random Unique"
                      onClick={() => {
                        setRandomSeed('')
                        void runRandomScenario(undefined)
                      }}
                    />
                    <p className="text-[10px] font-bold text-muted-foreground px-1">
                      Leave the seed empty for a unique scenario. The generated seed is written back here after a successful run.
                    </p>
                  </div>

                  <SectionLabel className="mt-5">Extended Seeds</SectionLabel>
                  <div className="grid grid-cols-2 gap-2">
                    <MiniAction icon={LucideTrendingDown} label="Degradation" onClick={() => run('Seed Degradation', () => seedDegradationScenario(activeBreweryId))} />
                    <MiniAction icon={LucideSiren} label="Ferm Alerts" onClick={() => run('Seed Ferm Alerts', () => seedFermentationAlerts(activeBreweryId))} />
                    <MiniAction icon={LucideDatabase} label="10 Batches" onClick={() => run('Seed 10 Batches', () => seedMockBatches(activeBreweryId))} />
                    <MiniAction icon={LucideBell} label="Test Push" color="orange" onClick={() => run('Test Push', () => sendTestNotification())} />
                  </div>
                </TabPanel>
              )}

              {/* ════════════ IOT TAB ════════════ */}
              {activeTab === 'iot' && (
                <TabPanel key="iot">
                  <SectionLabel>Single IoT Reading</SectionLabel>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <InputField id="iot-temp" label="Temperature °C" type="number" step="0.1" value={iotTemp} onChange={setIotTemp} />
                    <InputField id="iot-gravity" label="Gravity (SG)" value={iotGravity} onChange={setIotGravity} />
                  </div>
                  <ActionBtn
                    icon={LucideRadio}
                    label="Inject Reading"
                    onClick={() => run('IoT Reading', () => simulateIotReading(activeBreweryId, { temperature: parseFloat(iotTemp), gravity: iotGravity }))}
                  />

                  <SectionLabel className="mt-5">Burst Readings</SectionLabel>
                  <InputField id="iot-burst" label="Count" type="number" min={1} max={100} value={iotBurstCount} onChange={setIotBurstCount} className="mb-3" />
                  <ActionBtn
                    icon={LucideActivity}
                    label={`Burst ${iotBurstCount} Readings`}
                    onClick={() => run(`IoT Burst (${iotBurstCount})`, () => simulateIotBurst(activeBreweryId, parseInt(iotBurstCount, 10)))}
                  />

                  <SectionLabel className="mt-5">Cron Jobs</SectionLabel>
                  <ActionBtn
                    icon={LucideTimer}
                    label="Run Fermentation Alert Check"
                    onClick={() => run('Cron: Ferm Alerts', () => triggerFermentationAlertCron(activeBreweryId))}
                  />
                </TabPanel>
              )}

              {/* ════════════ OFFLINE TAB ════════════ */}
              {activeTab === 'offline' && (
                <TabPanel key="offline">
                  <SectionLabel>Queue Inspector</SectionLabel>
                  <div className="rounded-2xl border border-border bg-surface p-3 space-y-2 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-muted-foreground">Connection</span>
                      <span className={cn("text-xs font-black flex items-center gap-1.5", isOnline ? "text-green-400" : "text-red-400")}>
                        {isOnline ? <LucideWifi className="h-3 w-3" /> : <LucideCloudOff className="h-3 w-3" />}
                        {isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-muted-foreground">Pending Items</span>
                      <span className={cn("text-xs font-black tabular-nums", queueCount > 0 ? "text-orange-400" : "text-foreground")}>{queueCount}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <MiniAction icon={LucideArchive} label="Enqueue Voice" onClick={async () => {
                      await enqueueAction({ type: 'voice-log', payload: new Blob(['test-audio'], { type: 'audio/webm' }) })
                      await refreshQueue()
                      toast.success('Voice log enqueued')
                    }} />
                    <MiniAction icon={LucideRefreshCw} label="Refresh Count" onClick={async () => {
                      await refreshQueue()
                      toast.success(`Queue: ${queueCount} items`)
                    }} />
                  </div>

                  <div className="space-y-2">
                    <ActionBtn
                      icon={LucideActivity}
                      label="Force Flush Queue"
                      onClick={async () => {
                        await run('Flush Offline Queue', async () => {
                          await processQueue()
                          await refreshQueue()
                          return { success: true, message: `Queue flushed. ${queueCount} remaining.` }
                        })
                      }}
                    />
                    <ActionBtn
                      icon={LucideTrash2}
                      label="Clear Queue"
                      color="red"
                      onClick={async () => {
                        await clearOfflineQueue()
                        await refreshQueue()
                        toast.success('Offline queue cleared')
                      }}
                    />
                  </div>
                </TabPanel>
              )}

              {/* ════════════ TIERS TAB ════════════ */}
              {activeTab === 'tiers' && (
                <TabPanel key="tiers">
                  <div className="flex items-center justify-between px-1 mb-3">
                    <SectionLabel>Subscription Override</SectionLabel>
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                      {currentTier}
                    </span>
                  </div>
                  <div className="grid gap-2">
                    {TIER_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => run(`Set Tier: ${opt.label}`, () => setDevSubscriptionTier(activeBreweryId, opt.value))}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left",
                          currentTier === opt.value
                            ? "bg-purple-500/10 border-purple-500/50 text-foreground"
                            : "bg-surface border-border text-muted-foreground hover:bg-surface-active"
                        )}
                      >
                        <div className={cn(
                          "h-9 w-9 rounded-xl flex items-center justify-center font-black text-xs",
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
                </TabPanel>
              )}

              {/* ════════════ PERF TAB ════════════ */}
              {activeTab === 'perf' && (
                <TabPanel key="perf">
                  <SectionLabel>Performance Dataset</SectionLabel>
                  <p className="text-[10px] text-muted-foreground mb-3">Large data volumes for virtualization & rendering benchmarks.</p>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <InputField id="perf-batches" label="Batches" type="number" min={1} max={500} value={perfBatches} onChange={setPerfBatches} />
                    <InputField id="perf-readings" label="Readings / batch" type="number" min={1} max={100} value={perfReadings} onChange={setPerfReadings} />
                  </div>
                  <ActionBtn
                    icon={LucideBarChart3}
                    label="Seed Perf Data"
                    onClick={() => run('Seed Perf Data', () => seedLargeDataset(activeBreweryId, { batches: parseInt(perfBatches, 10), readingsPerBatch: parseInt(perfReadings, 10) }))}
                  />

                  <SectionLabel className="mt-5">Network Simulation</SectionLabel>
                  <button
                    onClick={() => setIsSlowNetwork(!isSlowNetwork)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-2xl border transition-all",
                      isSlowNetwork ? "bg-yellow-500/10 border-yellow-500/50" : "bg-surface-hover border-border"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <LucideWifiOff className={cn("h-4 w-4", isSlowNetwork ? "text-yellow-500" : "text-muted-foreground")} />
                      <span className={cn("text-xs font-black", isSlowNetwork ? "text-yellow-600 dark:text-yellow-200" : "text-muted-foreground")}>
                        Slow Network (+1.5s)
                      </span>
                    </div>
                    <div className={cn("w-10 h-5 rounded-full relative transition-colors", isSlowNetwork ? "bg-yellow-500" : "bg-card")}>
                      <div className={cn("absolute top-1 left-1 bottom-1 w-3 rounded-full bg-white transition-all", isSlowNetwork ? "translate-x-5" : "translate-x-0")} />
                    </div>
                  </button>
                </TabPanel>
              )}

              {/* ════════════ SETTINGS / LOGS TAB ════════════ */}
              {activeTab === 'settings' && (
                <TabPanel key="settings">
                  {/* Action History */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <SectionLabel>Action Trace</SectionLabel>
                      <button onClick={() => setActions([])} className="text-[10px] font-black text-purple-400 hover:text-purple-300">Clear</button>
                    </div>
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {actions.length === 0 ? (
                        <div className="text-center py-4 border-2 border-dashed border-border rounded-2xl">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">No recent actions</p>
                        </div>
                      ) : (
                        actions.map(action => (
                          <div key={action.id} className="flex items-center gap-3 p-2 bg-surface border border-border rounded-xl">
                            {action.status === 'pending' && <LucideLoader2 className="h-3 w-3 animate-spin text-purple-500 shrink-0" />}
                            {action.status === 'success' && <LucideCheck className="h-3 w-3 text-green-500 shrink-0" />}
                            {action.status === 'error' && <LucideX className="h-3 w-3 text-red-500 shrink-0" />}
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
                  <div className="pt-5 mt-5 border-t border-border space-y-3">
                    <SectionLabel className="text-red-500/60">Danger Zone</SectionLabel>
                    <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 space-y-3">
                      <div>
                        <label htmlFor="nuclear-confirm" className="text-[10px] font-bold text-red-400 mb-1 block">
                          Type <code className="font-mono">RESET</code> to enable
                        </label>
                        <input
                          id="nuclear-confirm"
                          type="text"
                          value={nuclearConfirmText}
                          onChange={e => setNuclearConfirmText(e.target.value)}
                          placeholder="RESET"
                          className="w-full rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-400 placeholder:text-red-500/30"
                        />
                      </div>
                      <button
                        disabled={nuclearConfirmText !== 'RESET'}
                        onClick={() => {
                          run('Nuclear Reset', () => nuclearReset(activeBreweryId))
                          setNuclearConfirmText('')
                        }}
                        className={cn(
                          "w-full flex items-center justify-center gap-2 py-3 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest",
                          nuclearConfirmText === 'RESET'
                            ? "bg-red-500 text-white hover:bg-red-600"
                            : "bg-red-500/10 border border-red-500/30 text-red-500/40 cursor-not-allowed"
                        )}
                      >
                        <LucideTrash2 className="h-4 w-4" />
                        Nuclear Reset
                      </button>
                      <p className="text-[8px] text-center font-bold text-muted-foreground uppercase">Wipes batches, tanks, inventory, sanitation logs</p>
                    </div>
                  </div>
                </TabPanel>
              )}

            </AnimatePresence>
          </div>

          {/* ── Footer ───────────────────────────────────────── */}
          <div className="px-4 py-2.5 bg-sidebar border-t border-border flex items-center justify-center gap-4">
            <div className="flex items-center gap-1.5 grayscale opacity-50">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
              <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest text-center">Dev Override Active · Ctrl+Shift+D</span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

// ─── Shared Sub-Components ──────────────────────────────────────────────

function TabPanel({ children, ...props }: { children: React.ReactNode } & Record<string, unknown>) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      transition={{ duration: 0.12 }}
      className="space-y-3"
      {...props}
    >
      {children}
    </motion.div>
  )
}

function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1", className)}>
      {children}
    </label>
  )
}

function ScenarioRow({ icon: Icon, label, desc, onClick }: { icon: typeof LucideZap; label: string; desc: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group w-full flex items-center gap-4 p-3 rounded-2xl bg-surface-hover border border-border hover:border-purple-500/50 hover:bg-purple-500/5 transition-all text-left"
    >
      <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center group-hover:bg-purple-500/20 group-hover:text-purple-400 transition-colors shrink-0">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-black text-foreground">{label}</p>
        <p className="text-[10px] text-muted-foreground font-bold">{desc}</p>
      </div>
      <LucideChevronRight className="h-4 w-4 text-foreground group-hover:text-purple-500 transition-colors shrink-0" />
    </button>
  )
}

function MiniAction({ icon: Icon, label, onClick, color = 'purple' }: { icon: typeof LucideZap; label: string; onClick: () => void; color?: 'purple' | 'orange' | 'red' }) {
  const colors = {
    purple: 'border-border bg-surface hover:bg-purple-500/5 hover:border-purple-500/30 text-muted-foreground hover:text-purple-400',
    orange: 'border-orange-500/30 bg-orange-500/5 text-orange-400 hover:bg-orange-500/10',
    red: 'border-red-500/30 bg-red-500/5 text-red-400 hover:bg-red-500/10',
  }
  return (
    <button onClick={onClick} className={cn("flex items-center gap-2 p-2.5 rounded-xl border transition-all text-left", colors[color])}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="text-[10px] font-black uppercase tracking-wider">{label}</span>
    </button>
  )
}

function ActionBtn({ icon: Icon, label, onClick, color = 'default' }: { icon: typeof LucideZap; label: string; onClick: () => void; color?: 'default' | 'red' }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-center gap-2 py-3 rounded-2xl border transition-all font-black text-[10px] uppercase tracking-widest",
        color === 'red'
          ? "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
          : "border-border bg-secondary/30 text-foreground hover:bg-secondary/60"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )
}

function InputField({
  id, label, value, onChange, className, ...props
}: {
  id: string; label: string; value: string; onChange: (v: string) => void; className?: string
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'>) {
  return (
    <div className={className}>
      <label htmlFor={id} className="text-[10px] font-bold text-muted-foreground mb-1 block">{label}</label>
      <input
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-xs"
        {...props}
      />
    </div>
  )
}

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <div>
      <label htmlFor={id} className="text-[10px] font-bold text-muted-foreground mb-1 block">{label}</label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-xs"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
