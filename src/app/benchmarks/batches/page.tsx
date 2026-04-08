import { notFound } from 'next/navigation'
import { BatchesFixturePage } from '@/components/BatchesFixturePage'
import { isBenchmarkRouteEnabled } from '@/lib/feature-flags'

export default function PublicBatchesBenchmarkPage() {
  if (!isBenchmarkRouteEnabled()) {
    notFound()
  }

  return <BatchesFixturePage />
}