import { AxeBuilder } from '@axe-core/playwright'
import type { Page } from '@playwright/test'

export const AXE_IMPACT_ORDER = ['critical', 'serious', 'moderate', 'minor', 'unknown'] as const

type AxeImpact = (typeof AXE_IMPACT_ORDER)[number]

export interface AxeNodeSummary {
  html: string
  target: string[]
  failureSummary?: string
}

export interface AxeViolationSummary {
  id: string
  impact: AxeImpact
  description: string
  help: string
  helpUrl: string
  tags: string[]
  nodes: AxeNodeSummary[]
  nodeCount: number
}

export interface RunAxeOptions {
  include?: string[]
  exclude?: string[]
  rules?: Record<string, { enabled: boolean }>
}

export interface AxeRunResult {
  generatedAt: string
  pageTitle: string
  pageUrl: string
  violations: AxeViolationSummary[]
  topViolations: AxeViolationSummary[]
  countsByImpact: Record<AxeImpact, number>
}

function normalizeImpact(impact: string | null | undefined): AxeImpact {
  if (!impact) {
    return 'unknown'
  }

  return AXE_IMPACT_ORDER.includes(impact as AxeImpact) ? impact as AxeImpact : 'unknown'
}

function getImpactRank(impact: AxeImpact) {
  return AXE_IMPACT_ORDER.indexOf(impact)
}

function normalizeTarget(target: unknown[] | undefined) {
  return (target ?? []).map((entry) => {
    if (typeof entry === 'string') {
      return entry
    }

    return JSON.stringify(entry)
  })
}

function isExecutionContextDestroyedError(error: unknown) {
  return error instanceof Error && error.message.includes('Execution context was destroyed')
}

export async function runAxe(page: Page, options: RunAxeOptions = {}): Promise<AxeRunResult> {
  let builder = new AxeBuilder({ page })

  if (options.include) {
    for (const selector of options.include) {
      builder = builder.include(selector)
    }
  }

  if (options.exclude) {
    for (const selector of options.exclude) {
      builder = builder.exclude(selector)
    }
  }

  if (options.rules) {
    builder = builder.options({
      rules: options.rules,
    })
  }

  const analyze = () => builder.analyze()

  let axeResults

  try {
    axeResults = await analyze()
  } catch (error) {
    if (!isExecutionContextDestroyedError(error)) {
      throw error
    }

    await page.waitForLoadState('domcontentloaded')
    await page.waitForLoadState('networkidle')
    axeResults = await analyze()
  }

  const violations = axeResults.violations
    .map((violation) => {
      const impact = normalizeImpact(violation.impact)

      return {
        id: violation.id,
        impact,
        description: violation.description,
        help: violation.help,
        helpUrl: violation.helpUrl,
        tags: violation.tags,
        nodes: violation.nodes.map((node) => ({
          html: node.html,
          target: normalizeTarget(node.target as unknown[] | undefined),
          failureSummary: node.failureSummary,
        })),
        nodeCount: violation.nodes.length,
      }
    })
    .sort((left, right) => {
      const impactDelta = getImpactRank(left.impact) - getImpactRank(right.impact)

      if (impactDelta !== 0) {
        return impactDelta
      }

      return right.nodeCount - left.nodeCount
    })

  const countsByImpact = AXE_IMPACT_ORDER.reduce<Record<AxeImpact, number>>((counts, impact) => {
    counts[impact] = violations.filter((violation) => violation.impact === impact).length
    return counts
  }, {
    critical: 0,
    serious: 0,
    moderate: 0,
    minor: 0,
    unknown: 0,
  })

  return {
    generatedAt: new Date().toISOString(),
    pageTitle: await page.title(),
    pageUrl: page.url(),
    violations,
    topViolations: violations.slice(0, 10),
    countsByImpact,
  }
}

export function getCriticalViolations(result: AxeRunResult) {
  return result.violations.filter((violation) => violation.impact === 'critical')
}