import fs from 'node:fs'
import path from 'node:path'

const [inputPath = 'eslint-fix-report.json', outputPath = 'eslint-fix-summary.json'] = process.argv.slice(2)

function loadReport(filePath) {
  const absolutePath = path.resolve(process.cwd(), filePath)

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`ESLint report not found: ${absolutePath}`)
  }

  return JSON.parse(fs.readFileSync(absolutePath, 'utf8'))
}

function buildSummary(report) {
  const topRules = new Map()
  const topFiles = []
  let totalFixableIssues = 0

  for (const file of report) {
    let fixableCount = 0

    for (const message of file.messages ?? []) {
      if (!message.fix) {
        continue
      }

      fixableCount += 1
      totalFixableIssues += 1

      const ruleId = message.ruleId ?? '(no-rule-id)'
      topRules.set(ruleId, (topRules.get(ruleId) ?? 0) + 1)
    }

    if (fixableCount > 0) {
      topFiles.push({
        filePath: path.relative(process.cwd(), file.filePath),
        fixableCount,
      })
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    reportPath: inputPath,
    totalFilesScanned: report.length,
    totalFilesWithFixableIssues: topFiles.length,
    totalFixableIssues,
    topFixableRules: [...topRules.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 30)
      .map(([ruleId, count]) => ({ ruleId, count })),
    topFixableFiles: topFiles
      .sort((left, right) => right.fixableCount - left.fixableCount)
      .slice(0, 30),
  }
}

try {
  const report = loadReport(inputPath)
  const summary = buildSummary(report)
  const absoluteOutputPath = path.resolve(process.cwd(), outputPath)

  fs.writeFileSync(absoluteOutputPath, `${JSON.stringify(summary, null, 2)}\n`)
  console.log(JSON.stringify(summary, null, 2))
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Failed to summarize ESLint fix report.')
  process.exit(1)
}