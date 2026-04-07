import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    include: ['./__tests__/**/*.test.ts', './__tests__/**/*.test.tsx'],
    exclude: ['./playwright/**'],
    setupFiles: ['./__tests__/setup.ts'],
  },
})