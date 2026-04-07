'use client'

import { useEffect } from 'react'

import { registerServiceWorker } from '@/lib/registerServiceWorker'

export function ServiceWorkerRegistration() {
  useEffect(() => {
    void registerServiceWorker().catch((error: unknown) => {
      console.error('Service worker registration failed:', error)
    })
  }, [])

  return null
}