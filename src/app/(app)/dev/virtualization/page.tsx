import { notFound } from 'next/navigation'
import { VirtualizationFixturePage as VirtualizationFixture } from '@/components/VirtualizationFixturePage'
import { isBenchmarkRouteEnabled } from '@/lib/feature-flags'

export default function VirtualizationFixturePage() {
  if (!isBenchmarkRouteEnabled()) {
    notFound()
  }

  return <VirtualizationFixture />
}