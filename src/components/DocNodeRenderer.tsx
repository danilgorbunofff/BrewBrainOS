import { LucideInfo, LucideAlertTriangle, LucideLightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DocNode } from '@/lib/docs-content'

const calloutConfig = {
  info: {
    icon: LucideInfo,
    border: 'border-blue-500/20',
    bg: 'bg-blue-500/5',
    iconColor: 'text-blue-500',
  },
  warning: {
    icon: LucideAlertTriangle,
    border: 'border-amber-500/20',
    bg: 'bg-amber-500/5',
    iconColor: 'text-amber-500',
  },
  tip: {
    icon: LucideLightbulb,
    border: 'border-emerald-500/20',
    bg: 'bg-emerald-500/5',
    iconColor: 'text-emerald-500',
  },
} as const

export function DocNodeRenderer({ nodes }: { nodes: DocNode[] }) {
  return (
    <div className="space-y-5">
      {nodes.map((node, i) => {
        switch (node.type) {
          case 'prose':
            return (
              <p key={i} className="text-sm text-muted-foreground leading-relaxed">
                {node.text}
              </p>
            )

          case 'subheading':
            return (
              <h3
                key={i}
                className="text-base font-black tracking-tight text-foreground font-heading pt-2"
              >
                {node.text}
              </h3>
            )

          case 'step':
            return (
              <ol key={i} className="space-y-2 pl-1">
                {node.steps.map((step, j) => (
                  <li key={j} className="flex gap-3 text-sm text-muted-foreground leading-relaxed">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary border border-primary/20">
                      {j + 1}
                    </span>
                    <span className="pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            )

          case 'callout': {
            const config = calloutConfig[node.variant]
            const Icon = config.icon
            return (
              <div
                key={i}
                className={cn(
                  'flex gap-3 rounded-xl border p-4',
                  config.border,
                  config.bg
                )}
              >
                <Icon className={cn('h-4 w-4 shrink-0 mt-0.5', config.iconColor)} />
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {node.text}
                </p>
              </div>
            )
          }
        }
      })}
    </div>
  )
}
