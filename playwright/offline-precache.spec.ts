import { expect, test } from '@playwright/test'

test.describe('offline precache', () => {
  test('serves the precached offline fallback for disconnected navigations', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL })
    const page = await context.newPage()

    await page.goto('/')

    const registration = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) {
        return null
      }

      const ready = await navigator.serviceWorker.ready

      return {
        scope: ready.scope,
        scriptURL: ready.active?.scriptURL ?? null,
      }
    })

    expect(registration).not.toBeNull()
    expect(registration?.scope).toContain('/')
    expect(registration?.scriptURL).toContain('/sw.js')

    await page.reload({ waitUntil: 'networkidle' })

    await expect
      .poll(() => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL ?? ''))
      .toContain('/sw.js')

    await context.setOffline(true)
    await page.goto('/__offline-smoke__', { waitUntil: 'domcontentloaded' })

    await expect(page).toHaveTitle(/Offline \| BrewBrain OS/i)
    await expect(page.locator('[data-testid="offline-fallback"]')).toBeVisible()
    await expect(page.getByRole('heading', { name: /Connection lost/i })).toBeVisible()

    await context.close()
  })
})