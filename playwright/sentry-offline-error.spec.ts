import { expect, test } from '@playwright/test'
import { callOfflineSyncFixture, waitForOfflineSyncFixture } from './helpers'

test.describe('offline sync retryable failures', () => {
  test('keeps a queued voice log after a retryable 500 response', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL })
    let syncRequests = 0

    await context.route('**/api/sync-voice', async (route) => {
      syncRequests += 1

      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Synthetic Sentry failure',
          retryable: true,
        }),
      })
    })

    const page = await context.newPage()
    await page.goto('/benchmarks/offline-sync')
    await waitForOfflineSyncFixture(page)

    expect(await callOfflineSyncFixture(page, 'clearQueue')).toBe(0)
    expect(await callOfflineSyncFixture(page, 'enqueueVoice')).toBe(1)

    await page.getByTestId('offline-sync-process').click()

    await expect.poll(() => callOfflineSyncFixture(page, 'getQueueCount')).toBe(1)
    await expect.poll(() => syncRequests).toBe(1)
    expect(syncRequests).toBe(1)

    await context.close()
  })
})