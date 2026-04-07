import { expect, test, type Page } from '@playwright/test'
import {
  callOfflineSyncFixture,
  openOfflineSyncFixture,
  setBrowserOfflineState,
} from './helpers'

async function clearQueueSafely(page: Page) {
  if (page.isClosed()) {
    return
  }

  await callOfflineSyncFixture(page, 'clearQueue').catch(() => undefined)
}

test.describe('offline sync fixture', () => {
  test('allows only one tab to flush the same queued item', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL })
    let syncRequests = 0

    await context.route('**/api/sync-voice', async (route) => {
      syncRequests += 1
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    })

    const firstPage = await context.newPage()
    const secondPage = await context.newPage()

    try {
      await Promise.all([
        openOfflineSyncFixture(firstPage),
        openOfflineSyncFixture(secondPage),
      ])

      expect(await callOfflineSyncFixture(firstPage, 'clearQueue')).toBe(0)

      await Promise.all([
        setBrowserOfflineState(firstPage, true),
        setBrowserOfflineState(secondPage, true),
      ])

      await Promise.all([
        expect(firstPage.getByTestId('offline-sync-online-state')).toHaveText('offline'),
        expect(secondPage.getByTestId('offline-sync-online-state')).toHaveText('offline'),
      ])

      expect(await callOfflineSyncFixture(firstPage, 'enqueueVoice')).toBe(1)

      await Promise.all([
        setBrowserOfflineState(firstPage, false),
        setBrowserOfflineState(secondPage, false),
      ])

      await Promise.all([
        expect(firstPage.getByTestId('offline-sync-online-state')).toHaveText('online'),
        expect(secondPage.getByTestId('offline-sync-online-state')).toHaveText('online'),
      ])

      await expect.poll(() => callOfflineSyncFixture(firstPage, 'getQueueCount'), { timeout: 30000 }).toBe(0)
      expect(syncRequests).toBe(1)
    } finally {
      await clearQueueSafely(firstPage)
      await context.close()
    }
  })

  test('flushes a queued voice log once the browser comes back online', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL })
    let syncRequests = 0

    await context.route('**/api/sync-voice', async (route) => {
      syncRequests += 1
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    })

    const page = await context.newPage()

    try {
      await openOfflineSyncFixture(page)

      expect(await callOfflineSyncFixture(page, 'clearQueue')).toBe(0)
      await setBrowserOfflineState(page, true)
      await expect(page.getByTestId('offline-sync-online-state')).toHaveText('offline')

      expect(await callOfflineSyncFixture(page, 'enqueueVoice')).toBe(1)
      await expect(page.getByTestId('offline-sync-queue-count')).toHaveText('1')

      await setBrowserOfflineState(page, false)

      await expect(page.getByTestId('offline-sync-online-state')).toHaveText('online')
      await expect.poll(() => callOfflineSyncFixture(page, 'getQueueCount'), { timeout: 30000 }).toBe(0)
      expect(syncRequests).toBe(1)
    } finally {
      await clearQueueSafely(page)
      await context.close()
    }
  })
})