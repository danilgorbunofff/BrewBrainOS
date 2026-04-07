import fs from 'node:fs'
import path from 'node:path'

const serviceWorkerPath = path.join(process.cwd(), 'public', 'sw.js')

if (!fs.existsSync(serviceWorkerPath)) {
  console.error(`Missing build artifact: ${serviceWorkerPath}. Run npm run build first.`)
  process.exit(1)
}

const serviceWorkerSource = fs.readFileSync(serviceWorkerPath, 'utf8')
const nullRevisionMatches = serviceWorkerSource.match(/["']revision["']\s*:\s*null/g) ?? []
const offlineFallbackEntryCount = serviceWorkerSource.match(/["']\/offline\.html["']/g)?.length ?? 0
const fallbackMatcherConfigured = /fallbacks:\{entries:\[\{url:["']\/offline\.html["']/.test(serviceWorkerSource)

if (nullRevisionMatches.length > 0) {
  console.error(`Found ${nullRevisionMatches.length} precache entries with revision: null in public/sw.js.`)
  process.exit(1)
}

if (offlineFallbackEntryCount < 2 || !fallbackMatcherConfigured) {
  console.error('The generated service worker is missing the precached offline fallback or the document fallback mapping.')
  process.exit(1)
}

console.log('Service worker precache verification passed.')