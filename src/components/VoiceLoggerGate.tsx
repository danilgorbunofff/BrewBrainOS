'use client'

import { UpgradeGate } from '@/components/UpgradeGate'
import { VoiceLogger } from '@/components/VoiceLogger'

/**
 * Wraps VoiceLogger with a tier gate (requires Production or higher).
 */
export function VoiceLoggerGate() {
  return (
    <UpgradeGate requiredTier="production" featureName="AI Voice Logging">
      <div className="rounded-[calc(1rem-1px)] border border-white/5 bg-white/[0.01] p-10 text-center">
        <div className="max-w-xl mx-auto space-y-4">
          <h2 className="text-2xl font-black tracking-tight text-white">Voice Command</h2>
          <p className="text-zinc-500 text-sm font-medium">Speak a production reading. AI extracts gravity, temperature, and notes.</p>
          <div className="pt-2">
            <VoiceLogger />
          </div>
        </div>
      </div>
    </UpgradeGate>
  )
}
