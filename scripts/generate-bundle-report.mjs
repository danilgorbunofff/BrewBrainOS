import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const htmlPath = path.join(root, '.next', 'analyze', 'client.html')
const reportPath = path.join(root, 'analysis', 'bundle-top10.md')

if (!fs.existsSync(htmlPath)) {
  throw new Error(`Analyzer output not found at ${htmlPath}. Run npm run analyze first.`)
}

const html = fs.readFileSync(htmlPath, 'utf8')
const chartDataMatch = html.match(/window\.chartData = (\[[\s\S]*?\]);\s*window\.entrypoints =/)

if (!chartDataMatch) {
  throw new Error('Unable to extract window.chartData from analyzer HTML.')
}

const chartData = JSON.parse(chartDataMatch[1])
const modulesByPath = new Map()

const walkNode = (node, chunkLabel) => {
  const groups = Array.isArray(node.groups) ? node.groups : []

  if (groups.length === 0 && typeof node.path === 'string') {
    const existing = modulesByPath.get(node.path) ?? {
      label: node.label,
      path: node.path,
      statSize: 0,
      parsedSize: 0,
      gzipSize: 0,
      chunks: new Set(),
    }

    existing.label = node.label ?? existing.label
    existing.statSize = Math.max(existing.statSize, node.statSize ?? 0)
    existing.parsedSize = Math.max(existing.parsedSize, node.parsedSize ?? 0)
    existing.gzipSize = Math.max(existing.gzipSize, node.gzipSize ?? 0)
    existing.chunks.add(chunkLabel)

    modulesByPath.set(node.path, existing)
    return
  }

  for (const group of groups) {
    walkNode(group, chunkLabel)
  }
}

for (const chunk of chartData) {
  walkNode(chunk, chunk.label)
}

const topModules = [...modulesByPath.values()]
  .sort((left, right) => right.parsedSize - left.parsedSize)
  .slice(0, 10)

const mainChunk = chartData.find((chunk) => chunk.label.startsWith('static/chunks/main-'))
const mainChunkModules = new Set()

if (mainChunk) {
  const collectMainChunkPaths = (node) => {
    const groups = Array.isArray(node.groups) ? node.groups : []

    if (groups.length === 0 && typeof node.path === 'string') {
      mainChunkModules.add(node.path)
      return
    }

    for (const group of groups) {
      collectMainChunkPaths(group)
    }
  }

  collectMainChunkPaths(mainChunk)
}

const formatKiB = (bytes) => `${(bytes / 1024).toFixed(1)} KiB`

const getRecommendation = (modulePath) => {
  if (
    modulePath.includes('jspdf') ||
    modulePath.includes('html2canvas') ||
    modulePath.includes('canvg') ||
    modulePath.includes('pako')
  ) {
    return {
      source: 'src/components/TTBReportTable.tsx',
      action: 'Keep the PDF stack behind the export button via dynamic import.',
    }
  }

  if (
    modulePath.includes('@yudiel/react-qr-scanner') ||
    modulePath.includes('barcode-detector')
  ) {
    return {
      source: 'src/components/MobileFloatingActions.tsx, src/components/QRScanner.tsx',
      action: 'Load the QR scanner only when a scan surface is actually shown.',
    }
  }

  if (modulePath.includes('@supabase')) {
    return {
      source: 'src/app/(app)/inventory/[id]/page.tsx',
      action: 'Move this route toward server-side data fetches or defer browser auth client creation.',
    }
  }

  if (modulePath.includes('framer-motion')) {
    return {
      source: 'src/components/CookieConsent.tsx, src/components/DevTools.tsx, src/components/ScrollReveal.tsx, src/components/TanksGrid.tsx',
      action: 'Keep motion code split at the component boundary where possible.',
    }
  }

  if (modulePath.includes('react-dom') || modulePath.includes('react-server-dom-webpack')) {
    return {
      source: 'framework runtime',
      action: 'Framework runtime cost. Focus on app-owned modules first.',
    }
  }

  return {
    source: 'review required',
    action: 'Inspect the owning route or component before changing behavior.',
  }
}

const totalParsedTop10 = topModules.reduce((sum, module) => sum + module.parsedSize, 0)
const generatedAt = new Date().toISOString()
const deferredChecks = [
  {
    label: 'PDF export stack',
    patterns: ['jspdf', 'html2canvas', 'canvg', 'pako'],
  },
  {
    label: 'QR scanner stack',
    patterns: ['@yudiel/react-qr-scanner', 'barcode-detector'],
  },
  {
    label: 'Browser Supabase auth client',
    patterns: ['@supabase/auth-js/dist/module/GoTrueClient.js'],
  },
]

const lines = [
  '# Bundle Top 10',
  '',
  `Generated from .next/analyze/client.html on ${generatedAt}.`,
  '',
  `Top 10 combined parsed size: ${formatKiB(totalParsedTop10)}.`,
  '',
  '| Rank | Module | Parsed | Gzip | Source hint | Action | Chunks |',
  '| --- | --- | ---: | ---: | --- | --- | --- |',
]

topModules.forEach((module, index) => {
  const recommendation = getRecommendation(module.path)
  const chunks = [...module.chunks].slice(0, 3).join(', ')

  lines.push(
    `| ${index + 1} | ${module.path} | ${formatKiB(module.parsedSize)} | ${formatKiB(module.gzipSize)} | ${recommendation.source} | ${recommendation.action} | ${chunks} |`
  )
})

lines.push('', '## Notes', '')
lines.push('- Parsed size is used for ranking because it best reflects code the browser must execute.')
lines.push('- These entries are extracted from the analyzer HTML because Next 16 did not emit JSON stats in this repo.')
lines.push('- Focus remediation on app-controlled modules before framework runtime entries.')

if (mainChunk) {
  lines.push('', '## Main Chunk Check', '')
  lines.push(`Main chunk: ${mainChunk.label} (${formatKiB(mainChunk.parsedSize ?? 0)} parsed).`)

  for (const check of deferredChecks) {
    const presentInMainChunk = check.patterns.some((pattern) =>
      [...mainChunkModules].some((modulePath) => modulePath.includes(pattern))
    )

    lines.push(`- ${check.label}: ${presentInMainChunk ? 'present in main chunk' : 'not present in main chunk'}.`)
  }
}

fs.mkdirSync(path.dirname(reportPath), { recursive: true })
fs.writeFileSync(reportPath, `${lines.join('\n')}\n`)

console.log(`Wrote ${reportPath}`)