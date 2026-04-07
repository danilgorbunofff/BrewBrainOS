import { defineConfig, devices } from '@playwright/test'

const PORT = 3005
const serverURL = process.env.PLAYWRIGHT_SERVER_URL || `http://127.0.0.1:${PORT}/benchmarks/virtualization`
const baseURL = process.env.PLAYWRIGHT_BASE_URL || new URL(serverURL).origin
const serverCommand = process.env.PLAYWRIGHT_SERVER_COMMAND || `npm run dev -- -p ${PORT}`
const useExistingServer = process.env.PLAYWRIGHT_USE_EXISTING_SERVER === 'true'

export default defineConfig({
  testDir: './playwright',
  timeout: 120000,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
  use: {
    baseURL,
    headless: true,
    trace: process.env.CI ? 'retain-on-failure' : 'on-first-retry',
  },
  webServer: useExistingServer
    ? undefined
    : {
        command: serverCommand,
        url: serverURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180000,
      },
})