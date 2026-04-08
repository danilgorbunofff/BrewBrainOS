import { expect, test } from '@playwright/test'
import { loginAsTestUser } from '../helpers'
import { getCriticalViolations, runAxe } from './axe-helper'
import { writeAxeReport } from './format-axe-report'

function hasTestUserCredentials() {
  return Boolean(process.env.E2E_TEST_USER_EMAIL && process.env.E2E_TEST_USER_PASSWORD)
}

test('runs axe on the batches page and persists a report', async ({ page }, testInfo) => {
  test.slow()

  if (hasTestUserCredentials()) {
    await loginAsTestUser(page)
    await page.goto('/batches')
  } else {
    await page.goto('/benchmarks/batches')
  }

  await expect(page.getByRole('heading', { name: 'Batches' })).toBeVisible()
  await expect(page.getByRole('textbox', { name: /batch search/i })).toBeVisible()
  await expect(page.getByRole('textbox', { name: /recipe name/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /create batch/i })).toBeVisible()

  const result = await runAxe(page)
  await writeAxeReport('batches', result, testInfo)

  expect(getCriticalViolations(result)).toEqual([])
})