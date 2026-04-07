import { expect, test } from '@playwright/test'

import {
  callOfflineSyncFixture,
  createSmokeBatchName,
  loginAsTestUser,
  openOfflineSyncFixture,
  setBrowserOfflineState,
} from '../helpers'

test.describe('ci smoke', () => {
  test('logs in with the dedicated test account', async ({ page }) => {
    await loginAsTestUser(page)

    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByText(/welcome back\./i)).toBeVisible()
  })

  test('creates and deletes a batch from the production batches page', async ({ page }) => {
    const batchName = createSmokeBatchName()

    await loginAsTestUser(page)
    await page.goto('/batches')

    await expect(page.getByRole('heading', { name: /^batches$/i })).toBeVisible()

    const addBatchForm = page.locator('form').filter({ has: page.locator('input[name="recipeName"]') }).first()

    await addBatchForm.locator('input[name="recipeName"]').fill(batchName)
    await addBatchForm.locator('input[name="og"]').fill('1.055')
    await addBatchForm.getByRole('button').click()

    await expect(page.getByText('Batch created successfully')).toBeVisible()
    await expect(page.getByRole('link', { name: batchName })).toBeVisible()

    await page.locator(`[title="Delete ${batchName}"]`).first().click()
    await page.getByRole('button', { name: /confirm purge/i }).click()

    await expect(page.getByText(`Permanently deleted ${batchName}`)).toBeVisible()
    await expect(page.getByRole('link', { name: batchName })).toHaveCount(0)
  })

  test('flushes queued offline work when connectivity returns', async ({ browser, baseURL }) => {
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

    await context.close()
  })
})