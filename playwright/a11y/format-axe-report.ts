import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { TestInfo } from '@playwright/test'
import type { AxeRunResult, AxeViolationSummary } from './axe-helper'

const IMPACT_LABELS: Record<AxeViolationSummary['impact'], string> = {
  critical: 'Critical',
  serious: 'Serious',
  moderate: 'Moderate',
  minor: 'Minor',
  unknown: 'Unknown',
}

const FIX_SUGGESTIONS: Array<{
  id: string
  fileCandidates: string[]
  suggestion: string
}> = [
  {
    id: 'button-name',
    fileCandidates: ['src/components/BatchesTable.tsx', 'src/components/DeleteConfirmDialog.tsx', 'src/components/ExportCSVButton.tsx'],
    suggestion: 'Add an accessible name with visible text or aria-label to every icon-only button and link trigger.',
  },
  {
    id: 'input-image-alt',
    fileCandidates: ['src/components/AddBatchForm.tsx', 'src/components/SearchFilter.tsx'],
    suggestion: 'Add descriptive labels or alt text instead of relying on placeholders or decorative-only rendering.',
  },
  {
    id: 'label',
    fileCandidates: ['src/components/AddBatchForm.tsx', 'src/components/SearchFilter.tsx'],
    suggestion: 'Associate every form control with a programmatic label using label/for or aria-label when there is no visible label.',
  },
  {
    id: 'color-contrast',
    fileCandidates: ['src/app/globals.css', 'src/components/BatchesTable.tsx', 'src/components/AddBatchForm.tsx'],
    suggestion: 'Increase text-to-background contrast by adjusting color tokens or component-specific utility classes until axe clears the combination.',
  },
  {
    id: 'aria-dialog-name',
    fileCandidates: ['src/components/ui/dialog.tsx', 'src/components/BatchesTable.tsx'],
    suggestion: 'Ensure dialog content exposes a valid accessible name and description through the dialog title/description elements or aria-labelledby/aria-describedby.',
  },
  {
    id: 'aria-required-children',
    fileCandidates: ['src/components/BatchesTable.tsx', 'src/components/VirtualizationFixturePage.tsx'],
    suggestion: 'Restore the expected semantic child structure for composite widgets or switch back to native semantics for the virtualized table container.',
  },
]

function getSuggestion(violation: AxeViolationSummary) {
  const matched = FIX_SUGGESTIONS.find((entry) => entry.id === violation.id)

  if (matched) {
    return matched
  }

  return {
    fileCandidates: ['src/components/BatchesTable.tsx', 'src/components/AddBatchForm.tsx', 'src/components/ui/dialog.tsx'],
    suggestion: 'Inspect the failing selectors and apply the fix in the component that renders them, then rerun the axe audit to confirm the violation is removed.',
  }
}

function formatSelectors(violation: AxeViolationSummary) {
  return violation.nodes
    .flatMap((node) => node.target)
    .slice(0, 5)
    .map((target) => `- ${target}`)
    .join('\n')
}

function formatSummary(targetName: string, result: AxeRunResult) {
  const header = [
    `# AXE summary: ${targetName}`,
    '',
    `- URL: ${result.pageUrl}`,
    `- Title: ${result.pageTitle}`,
    `- Generated: ${result.generatedAt}`,
    `- Violations: ${result.violations.length}`,
    `- Critical: ${result.countsByImpact.critical}`,
    `- Serious: ${result.countsByImpact.serious}`,
    `- Moderate: ${result.countsByImpact.moderate}`,
    `- Minor: ${result.countsByImpact.minor}`,
    '',
    '## Top 10',
    '',
  ]

  if (result.topViolations.length === 0) {
    return [...header, 'No accessibility violations were reported by axe on this target.', ''].join('\n')
  }

  const body = result.topViolations.map((violation, index) => {
    const suggestion = getSuggestion(violation)

    return [
      `### ${index + 1}. ${violation.help}`,
      '',
      `- Rule: ${violation.id}`,
      `- Impact: ${IMPACT_LABELS[violation.impact]}`,
      `- Affected nodes: ${violation.nodeCount}`,
      `- Fix suggestion: ${suggestion.suggestion}`,
      `- Candidate files: ${suggestion.fileCandidates.join(', ')}`,
      `- Help: ${violation.helpUrl}`,
      '- Failing selectors:',
      formatSelectors(violation) || '- No selectors reported by axe.',
      '',
    ].join('\n')
  })

  return [...header, ...body].join('\n')
}

export async function writeAxeReport(targetName: string, result: AxeRunResult, testInfo?: TestInfo) {
  const outputDir = path.join(process.cwd(), 'test-results', 'a11y')
  await mkdir(outputDir, { recursive: true })

  const jsonPath = path.join(outputDir, `${targetName}.json`)
  const summaryPath = path.join(outputDir, `${targetName}-summary.md`)
  const summary = formatSummary(targetName, result)

  await Promise.all([
    writeFile(jsonPath, JSON.stringify(result, null, 2), 'utf8'),
    writeFile(summaryPath, summary, 'utf8'),
  ])

  if (testInfo) {
    await Promise.all([
      testInfo.attach(`${targetName}.json`, {
        body: JSON.stringify(result, null, 2),
        contentType: 'application/json',
      }),
      testInfo.attach(`${targetName}-summary.md`, {
        body: summary,
        contentType: 'text/markdown',
      }),
    ])
  }

  return {
    jsonPath,
    summaryPath,
    summary,
  }
}