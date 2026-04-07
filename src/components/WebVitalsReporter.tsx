'use client'

import { useReportWebVitals } from 'next/web-vitals'
import { reportPerformanceMetric } from '@/lib/performance-monitoring'

export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    reportPerformanceMetric({
      category: 'web-vital',
      name: metric.name,
      value: metric.value,
      unit: metric.name === 'CLS' ? 'score' : 'ms',
      detail: {
        id: metric.id,
        delta: metric.delta,
        rating: metric.rating,
        navigationType: metric.navigationType,
      },
    })
  })

  return null
}