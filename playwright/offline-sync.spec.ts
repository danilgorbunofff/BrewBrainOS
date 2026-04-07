import { expect, test } from '@playwright/test'

type OfflineSyncFixtureApi = {
  clearQueue: () => Promise<number>
  enqueueVoice: () => Promise<number>
  flushQueue: () => Promise<number>
  getQueueCount: () => Promise<number>
}

async function waitForFixture(page: import('@playwright/test').Page) {
  await page.waitForFunction(() => {
    return Boolean((window as Window & { __offlineSyncFixture?: unknown }).__offlineSyncFixture)
  })
}

async function callFixture(page: import('@playwright/test').Page, action: keyof OfflineSyncFixtureApi) {
  return page.evaluate(async (actionName) => {
    const api = (window as Window & { __offlineSyncFixture?: OfflineSyncFixtureApi }).__offlineSyncFixture
    if (!api) {
      throw new Error('Offline sync fixture API is unavailable')
    }

    return api[actionName]()
  }, action)
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

    await firstPage.goto('/benchmarks/offline-sync')
    await secondPage.goto('/benchmarks/offline-sync')
  await waitForFixture(firstPage)
  await waitForFixture(secondPage)

    expect(await callFixture(firstPage, 'clearQueue')).toBe(0)
    expect(await callFixture(firstPage, 'enqueueVoice')).toBe(1)

    await Promise.all([
      callFixture(firstPage, 'flushQueue'),
      callFixture(secondPage, 'flushQueue'),
    ])

    await expect.poll(() => callFixture(firstPage, 'getQueueCount')).toBe(0)
    expect(syncRequests).toBe(1)

    await context.close()
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
    await page.goto('/benchmarks/offline-sync')
  await waitForFixture(page)

  expect(await callFixture(page, 'clearQueue')).toBe(0)
  await context.setOffline(true)
  expect(await callFixture(page, 'enqueueVoice')).toBe(1)

    await context.setOffline(false)

    await expect(page.getByTestId('offline-sync-online-state')).toHaveText('online')
  await expect.poll(() => callFixture(page, 'getQueueCount')).toBe(0)
    expect(syncRequests).toBe(1)

    await context.close()
  })
})