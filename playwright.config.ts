import { defineConfig } from '@playwright/test'

const PORT = 3005
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${PORT}`
const useExistingServer = Boolean(process.env.PLAYWRIGHT_BASE_URL)

export default defineConfig({
  testDir: './playwright',
  timeout: 120000,
  use: {
    baseURL,
    headless: true,
  },
  webServer: useExistingServer
    ? undefined
    : {
        command: `npm run dev -- -p ${PORT}`,
        url: `http://localhost:${PORT}/benchmarks/virtualization`,
        reuseExistingServer: true,
        timeout: 180000,
      },
})