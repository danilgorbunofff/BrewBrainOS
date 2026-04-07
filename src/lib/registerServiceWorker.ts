const SERVICE_WORKER_SCOPE = '/'
const SERVICE_WORKER_URL = '/sw.js'

let pendingRegistration: Promise<ServiceWorkerRegistration> | undefined

export async function registerServiceWorker() {
  if (typeof window === 'undefined' || process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) {
    return undefined
  }

  const expectedScriptUrl = new URL(SERVICE_WORKER_URL, window.location.origin).href
  const existingRegistration = await navigator.serviceWorker.getRegistration(SERVICE_WORKER_SCOPE)

  if (existingRegistration?.active?.scriptURL === expectedScriptUrl) {
    return existingRegistration
  }

  if (pendingRegistration) {
    return pendingRegistration
  }

  pendingRegistration = navigator.serviceWorker.register(SERVICE_WORKER_URL, {
    scope: SERVICE_WORKER_SCOPE,
  })

  try {
    return await pendingRegistration
  } catch (error) {
    pendingRegistration = undefined
    throw error
  }
}