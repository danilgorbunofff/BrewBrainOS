import { expect, test } from '@playwright/test'

interface ScrollBenchmarkResult {
  averageFrameMs: number
  clientHeight: number
  droppedFrames: number
  maxFrameMs: number
  p95FrameMs: number
  sampleCount: number
  scrollHeight: number
}

async function measureScrollBenchmark(page: import('@playwright/test').Page, selector: string, rowSelector: string) {
  return page.locator(selector).evaluate(async (element, currentRowSelector) => {
    const container = element as HTMLElement
    const maxScrollTop = Math.max(container.scrollHeight - container.clientHeight, 0)
    const frameTimes: number[] = []

    container.scrollTop = 0

    return await new Promise<ScrollBenchmarkResult>((resolve) => {
      const durationMs = 2500
      const start = performance.now()
      let last = start

      const step = (now: number) => {
        const delta = now - last

        if (now !== start) {
          frameTimes.push(delta)
        }

        last = now

        const progress = Math.min((now - start) / durationMs, 1)
        container.scrollTop = maxScrollTop * progress
        container.dispatchEvent(new Event('scroll'))

        if (progress < 1) {
          requestAnimationFrame(step)
          return
        }

        const sorted = [...frameTimes].sort((left, right) => left - right)
        const p95Index = sorted.length === 0
          ? 0
          : Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))

        resolve({
          averageFrameMs: frameTimes.length > 0
            ? frameTimes.reduce((total, value) => total + value, 0) / frameTimes.length
            : 0,
          clientHeight: container.clientHeight,
          droppedFrames: frameTimes.filter((value) => value > 20).length,
          maxFrameMs: sorted.at(-1) || 0,
          p95FrameMs: sorted[p95Index] || 0,
          sampleCount: frameTimes.length,
          scrollHeight: container.scrollHeight,
        })
      }

      requestAnimationFrame(step)
    })
  }, rowSelector)
}

test('captures virtualization frame timings on the public benchmark route', async ({ page }, testInfo) => {
  test.slow()

  await page.goto('/benchmarks/virtualization')
  await expect(page.getByTestId('virtualization-fixture-page')).toBeVisible()
  await page.waitForLoadState('networkidle')

  const inventory = await measureScrollBenchmark(page, '[data-benchmark-scroll="inventory"]', '[data-virtual-row="inventory"]')
  const batches = await measureScrollBenchmark(page, '[data-benchmark-scroll="batches"]', '[data-virtual-row="batches"]')
  const inventoryRenderedRowCount = await page.locator('[data-benchmark-scroll="inventory"] [data-virtual-row="inventory"]').count()
  const batchesRenderedRowCount = await page.locator('[data-benchmark-scroll="batches"] [data-virtual-row="batches"]').count()

  const result = {
    inventory: {
      ...inventory,
      renderedRowCount: inventoryRenderedRowCount,
      approximateFps: inventory.averageFrameMs > 0 ? 1000 / inventory.averageFrameMs : 0,
    },
    batches: {
      ...batches,
      renderedRowCount: batchesRenderedRowCount,
      approximateFps: batches.averageFrameMs > 0 ? 1000 / batches.averageFrameMs : 0,
    },
  }

  console.log('[virtualization-benchmark]', JSON.stringify(result))

  await testInfo.attach('virtualization-benchmark.json', {
    body: JSON.stringify(result, null, 2),
    contentType: 'application/json',
  })

  expect(inventoryRenderedRowCount).toBeLessThan(120)
  expect(batchesRenderedRowCount).toBeLessThan(120)
  expect(inventory.sampleCount).toBeGreaterThan(30)
  expect(batches.sampleCount).toBeGreaterThan(30)
  expect(inventory.averageFrameMs).toBeLessThan(60)
  expect(batches.averageFrameMs).toBeLessThan(60)
  expect(inventory.p95FrameMs).toBeLessThan(120)
  expect(batches.p95FrameMs).toBeLessThan(120)
})