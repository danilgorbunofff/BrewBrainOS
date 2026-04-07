# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: offline-queue.e2e.spec.ts >> offline queue e2e >> flushes queued voice logs after the browser reconnects
- Location: playwright/offline-queue.e2e.spec.ts:18:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 2
Received: 3
```

# Test source

```ts
  1   | import { expect, test, type Page } from '@playwright/test'
  2   | 
  3   | import {
  4   |   callOfflineSyncFixture,
  5   |   openOfflineSyncFixture,
  6   |   setBrowserOfflineState,
  7   | } from './helpers'
  8   | 
  9   | async function clearQueueSafely(page: Page) {
  10  |   if (page.isClosed()) {
  11  |     return
  12  |   }
  13  | 
  14  |   await callOfflineSyncFixture(page, 'clearQueue').catch(() => undefined)
  15  | }
  16  | 
  17  | test.describe('offline queue e2e', () => {
  18  |   test('flushes queued voice logs after the browser reconnects', async ({ browser, baseURL }) => {
  19  |     const context = await browser.newContext({ baseURL })
  20  |     let syncRequests = 0
  21  | 
  22  |     await context.route('**/api/sync-voice', async (route) => {
  23  |       syncRequests += 1
  24  |       await route.fulfill({
  25  |         status: 200,
  26  |         contentType: 'application/json',
  27  |         body: JSON.stringify({ success: true }),
  28  |       })
  29  |     })
  30  | 
  31  |     const page = await context.newPage()
  32  | 
  33  |     try {
  34  |       await openOfflineSyncFixture(page)
  35  |       expect(await callOfflineSyncFixture(page, 'clearQueue')).toBe(0)
  36  | 
  37  |       await setBrowserOfflineState(page, true)
  38  |       await expect(page.getByTestId('offline-sync-online-state')).toHaveText('offline')
  39  | 
  40  |       expect(await callOfflineSyncFixture(page, 'enqueueVoice')).toBe(1)
  41  |       expect(await callOfflineSyncFixture(page, 'enqueueVoice')).toBe(2)
  42  |       await expect(page.getByTestId('offline-sync-queue-count')).toHaveText('2')
  43  | 
  44  |       await setBrowserOfflineState(page, false)
  45  |       await expect(page.getByTestId('offline-sync-online-state')).toHaveText('online')
  46  | 
  47  |       await expect.poll(() => callOfflineSyncFixture(page, 'getQueueCount'), { timeout: 30000 }).toBe(0)
  48  | 
> 49  |       expect(syncRequests).toBe(2)
      |                            ^ Error: expect(received).toBe(expected) // Object.is equality
  50  |     } finally {
  51  |       await clearQueueSafely(page)
  52  |       await context.close()
  53  |     }
  54  |   })
  55  | 
  56  |   test('allows only one tab to flush the same queued item', async ({ browser, baseURL }) => {
  57  |     const context = await browser.newContext({ baseURL })
  58  |     let syncRequests = 0
  59  | 
  60  |     await context.route('**/api/sync-voice', async (route) => {
  61  |       syncRequests += 1
  62  |       await route.fulfill({
  63  |         status: 200,
  64  |         contentType: 'application/json',
  65  |         body: JSON.stringify({ success: true }),
  66  |       })
  67  |     })
  68  | 
  69  |     const firstPage = await context.newPage()
  70  |     const secondPage = await context.newPage()
  71  | 
  72  |     try {
  73  |       await Promise.all([
  74  |         openOfflineSyncFixture(firstPage),
  75  |         openOfflineSyncFixture(secondPage),
  76  |       ])
  77  | 
  78  |       expect(await callOfflineSyncFixture(firstPage, 'clearQueue')).toBe(0)
  79  | 
  80  |       await Promise.all([
  81  |         setBrowserOfflineState(firstPage, true),
  82  |         setBrowserOfflineState(secondPage, true),
  83  |       ])
  84  |       await Promise.all([
  85  |         expect(firstPage.getByTestId('offline-sync-online-state')).toHaveText('offline'),
  86  |         expect(secondPage.getByTestId('offline-sync-online-state')).toHaveText('offline'),
  87  |       ])
  88  | 
  89  |       expect(await callOfflineSyncFixture(firstPage, 'enqueueVoice')).toBe(1)
  90  |       await expect(firstPage.getByTestId('offline-sync-queue-count')).toHaveText('1')
  91  | 
  92  |       await context.setOffline(false)
  93  |       await Promise.all([
  94  |         firstPage.evaluate(() => {
  95  |           window.__offlineSyncOnlineOverride = true
  96  |         }),
  97  |         secondPage.evaluate(() => {
  98  |           window.__offlineSyncOnlineOverride = true
  99  |         }),
  100 |       ])
  101 | 
  102 |       await Promise.all([
  103 |         callOfflineSyncFixture(firstPage, 'flushQueue'),
  104 |         callOfflineSyncFixture(secondPage, 'flushQueue'),
  105 |       ])
  106 | 
  107 |       await expect.poll(() => callOfflineSyncFixture(firstPage, 'getQueueCount'), { timeout: 30000 }).toBe(0)
  108 |       expect(syncRequests).toBe(1)
  109 |     } finally {
  110 |       await clearQueueSafely(firstPage)
  111 |       await context.close()
  112 |     }
  113 |   })
  114 | })
```