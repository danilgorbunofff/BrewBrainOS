# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: offline-sync.spec.ts >> offline sync fixture >> flushes a queued voice log once the browser comes back online
- Location: playwright/offline-sync.spec.ts:71:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 1
Received: 2
```

# Test source

```ts
  1   | import { expect, test, type Page } from '@playwright/test'
  2   | import {
  3   |   callOfflineSyncFixture,
  4   |   openOfflineSyncFixture,
  5   |   setBrowserOfflineState,
  6   | } from './helpers'
  7   | 
  8   | async function clearQueueSafely(page: Page) {
  9   |   if (page.isClosed()) {
  10  |     return
  11  |   }
  12  | 
  13  |   await callOfflineSyncFixture(page, 'clearQueue').catch(() => undefined)
  14  | }
  15  | 
  16  | test.describe('offline sync fixture', () => {
  17  |   test('allows only one tab to flush the same queued item', async ({ browser, baseURL }) => {
  18  |     const context = await browser.newContext({ baseURL })
  19  |     let syncRequests = 0
  20  | 
  21  |     await context.route('**/api/sync-voice', async (route) => {
  22  |       syncRequests += 1
  23  |       await route.fulfill({
  24  |         status: 200,
  25  |         contentType: 'application/json',
  26  |         body: JSON.stringify({ success: true }),
  27  |       })
  28  |     })
  29  | 
  30  |     const firstPage = await context.newPage()
  31  |     const secondPage = await context.newPage()
  32  | 
  33  |     try {
  34  |       await Promise.all([
  35  |         openOfflineSyncFixture(firstPage),
  36  |         openOfflineSyncFixture(secondPage),
  37  |       ])
  38  | 
  39  |       expect(await callOfflineSyncFixture(firstPage, 'clearQueue')).toBe(0)
  40  | 
  41  |       await Promise.all([
  42  |         setBrowserOfflineState(firstPage, true),
  43  |         setBrowserOfflineState(secondPage, true),
  44  |       ])
  45  | 
  46  |       await Promise.all([
  47  |         expect(firstPage.getByTestId('offline-sync-online-state')).toHaveText('offline'),
  48  |         expect(secondPage.getByTestId('offline-sync-online-state')).toHaveText('offline'),
  49  |       ])
  50  | 
  51  |       expect(await callOfflineSyncFixture(firstPage, 'enqueueVoice')).toBe(1)
  52  | 
  53  |       await Promise.all([
  54  |         setBrowserOfflineState(firstPage, false),
  55  |         setBrowserOfflineState(secondPage, false),
  56  |       ])
  57  | 
  58  |       await Promise.all([
  59  |         expect(firstPage.getByTestId('offline-sync-online-state')).toHaveText('online'),
  60  |         expect(secondPage.getByTestId('offline-sync-online-state')).toHaveText('online'),
  61  |       ])
  62  | 
  63  |       await expect.poll(() => callOfflineSyncFixture(firstPage, 'getQueueCount'), { timeout: 30000 }).toBe(0)
  64  |       expect(syncRequests).toBe(1)
  65  |     } finally {
  66  |       await clearQueueSafely(firstPage)
  67  |       await context.close()
  68  |     }
  69  |   })
  70  | 
  71  |   test('flushes a queued voice log once the browser comes back online', async ({ browser, baseURL }) => {
  72  |     const context = await browser.newContext({ baseURL })
  73  |     let syncRequests = 0
  74  | 
  75  |     await context.route('**/api/sync-voice', async (route) => {
  76  |       syncRequests += 1
  77  |       await route.fulfill({
  78  |         status: 200,
  79  |         contentType: 'application/json',
  80  |         body: JSON.stringify({ success: true }),
  81  |       })
  82  |     })
  83  | 
  84  |     const page = await context.newPage()
  85  | 
  86  |     try {
  87  |       await openOfflineSyncFixture(page)
  88  | 
  89  |       expect(await callOfflineSyncFixture(page, 'clearQueue')).toBe(0)
  90  |       await setBrowserOfflineState(page, true)
  91  |       await expect(page.getByTestId('offline-sync-online-state')).toHaveText('offline')
  92  | 
  93  |       expect(await callOfflineSyncFixture(page, 'enqueueVoice')).toBe(1)
  94  |       await expect(page.getByTestId('offline-sync-queue-count')).toHaveText('1')
  95  | 
  96  |       await setBrowserOfflineState(page, false)
  97  | 
  98  |       await expect(page.getByTestId('offline-sync-online-state')).toHaveText('online')
  99  |       await expect.poll(() => callOfflineSyncFixture(page, 'getQueueCount'), { timeout: 30000 }).toBe(0)
> 100 |       expect(syncRequests).toBe(1)
      |                            ^ Error: expect(received).toBe(expected) // Object.is equality
  101 |     } finally {
  102 |       await clearQueueSafely(page)
  103 |       await context.close()
  104 |     }
  105 |   })
  106 | })
```