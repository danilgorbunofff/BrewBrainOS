import { expect, test } from '@playwright/test'
import { getCriticalViolations, runAxe } from './axe-helper'
import { writeAxeReport } from './format-axe-report'

async function scrollVirtualizedTables(page: import('@playwright/test').Page) {
  const scrollers = page.locator('[data-benchmark-scroll]')
  const count = await scrollers.count()

  for (let index = 0; index < count; index += 1) {
    const scroller = scrollers.nth(index)

    await expect(scroller).toBeVisible()
    await scroller.evaluate((element) => {
      const container = element as HTMLElement
      container.scrollTop = Math.floor(container.scrollHeight * 0.5)
      container.dispatchEvent(new Event('scroll'))
    })
  }
}

test('runs axe on the virtualization benchmark route and persists a report', async ({ page }, testInfo) => {
  test.slow()

  await page.goto('/benchmarks/virtualization')
  await expect(page.getByTestId('virtualization-fixture-page')).toBeVisible()
  await expect(page.getByRole('heading', { name: /table virtualization stress route/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: /batch fixture/i })).toBeVisible()
  await page.setViewportSize({ width: 1440, height: 1200 })
  await scrollVirtualizedTables(page)

  const result = await runAxe(page)
  await writeAxeReport('virtualization', result, testInfo)

  expect(getCriticalViolations(result)).toEqual([])
})