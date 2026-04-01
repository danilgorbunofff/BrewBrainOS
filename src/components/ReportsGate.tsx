'use client'

import { UpgradeGate } from '@/components/UpgradeGate'

/**
 * Wraps the Reports page content with a tier gate (requires Production or higher).
 */
export function ReportsGate({ children }: { children: React.ReactNode }) {
  return (
    <UpgradeGate requiredTier="production" featureName="TTB Compliance Reports">
      {children}
    </UpgradeGate>
  )
}
