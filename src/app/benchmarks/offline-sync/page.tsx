import { notFound } from 'next/navigation'
import { OfflineSyncFixturePage } from '@/components/OfflineSyncFixturePage'
import { isBenchmarkRouteEnabled } from '@/lib/feature-flags'

export default function OfflineSyncBenchmarkPage() {
  if (!isBenchmarkRouteEnabled()) {
    notFound()
  }

  return <OfflineSyncFixturePage />
}