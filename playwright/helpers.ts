import { expect, type Page } from '@playwright/test'

type OfflineSyncFixtureApi = {
  clearQueue: () => Promise<number>
  enqueueVoice: () => Promise<number>
  flushQueue: () => Promise<number>
  getQueueCount: () => Promise<number>
}

function getRequiredEnv(name: 'E2E_TEST_USER_EMAIL' | 'E2E_TEST_USER_PASSWORD') {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

function isExecutionContextDestroyedError(error: unknown) {
  return error instanceof Error && error.message.includes('Execution context was destroyed')
}

function isOfflineFixtureUnavailableError(error: unknown) {
  return error instanceof Error && error.message.includes('Offline sync fixture API is unavailable')
}

export async function loginAsTestUser(page: Page) {
  await page.goto('/login')

  await page.getByLabel(/email address/i).fill(getRequiredEnv('E2E_TEST_USER_EMAIL'))
  await page.getByLabel(/password/i).fill(getRequiredEnv('E2E_TEST_USER_PASSWORD'))
  await page.getByRole('button', { name: /log in/i }).click()

  await page.waitForURL('**/dashboard')
  await expect(page.getByRole('heading', { name: /brewery brain/i })).toBeVisible()
}

export function createSmokeBatchName(prefix = 'CI Smoke Batch') {
  return `${prefix} ${new Date().toISOString().replace(/[.:]/g, '-')}`
}

export async function waitForOfflineSyncFixture(page: Page) {
  await expect(page.getByTestId('offline-sync-fixture-page')).toBeVisible()

  await page.waitForFunction(() => {
    return Boolean((window as Window & { __offlineSyncFixture?: unknown }).__offlineSyncFixture)
  })
}

export async function openOfflineSyncFixture(page: Page) {
  await page.goto('/benchmarks/offline-sync')
  await waitForOfflineSyncFixture(page)

  const needsServiceWorkerControl = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) {
      return false
    }

    const registration = await navigator.serviceWorker.ready
    return Boolean(registration.active) && !navigator.serviceWorker.controller
  })

  if (needsServiceWorkerControl) {
    await page.reload({ waitUntil: 'networkidle' })
    await waitForOfflineSyncFixture(page)
  }

  await expect(page.getByTestId('offline-sync-queue-count')).toBeVisible()
}

export async function setBrowserOfflineState(page: Page, offline: boolean) {
  await page.context().setOffline(offline)

  const applyOnlineState = async () => {
    await page.evaluate((isOffline) => {
      ;(window as Window & { __offlineSyncOnlineOverride?: boolean }).__offlineSyncOnlineOverride = !isOffline

      window.dispatchEvent(new Event(isOffline ? 'offline' : 'online'))
    }, offline)
  }

  try {
    await applyOnlineState()
  } catch (error) {
    if (!offline && isExecutionContextDestroyedError(error)) {
      await page.waitForLoadState('domcontentloaded')
      await applyOnlineState()
      return
    }

    throw error
  }
}

export async function callOfflineSyncFixture(page: Page, action: keyof OfflineSyncFixtureApi) {
  const invoke = async () => {
    await page.waitForFunction(() => {
      return Boolean((window as Window & { __offlineSyncFixture?: unknown }).__offlineSyncFixture)
    })

    return page.evaluate(async (actionName) => {
      const api = (window as Window & { __offlineSyncFixture?: OfflineSyncFixtureApi }).__offlineSyncFixture

      if (!api) {
        throw new Error('Offline sync fixture API is unavailable')
      }

      return api[actionName]()
    }, action)
  }

  try {
    return await invoke()
  } catch (error) {
    if (!isExecutionContextDestroyedError(error) && !isOfflineFixtureUnavailableError(error)) {
      throw error
    }

    await page.waitForLoadState('domcontentloaded')
    return invoke()
  }
}