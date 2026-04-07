import { notFound } from 'next/navigation'
import { VirtualizationFixturePage } from '@/components/VirtualizationFixturePage'
import { isBenchmarkRouteEnabled } from '@/lib/feature-flags'

export default function PublicVirtualizationBenchmarkPage() {
  if (!isBenchmarkRouteEnabled()) {
    notFound()
  }

  return <VirtualizationFixturePage mode="benchmark" />
}