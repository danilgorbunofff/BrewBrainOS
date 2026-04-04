'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LucidePalette, LucideSun, LucideMoon, LucideMonitor } from 'lucide-react'
import { cn } from '@/lib/utils'

const themes = [
  { value: 'dark', label: 'Dark Mode', description: 'Default brewery dark theme', icon: LucideMoon },
  { value: 'light', label: 'Light Mode', description: 'Bright theme for office use', icon: LucideSun },
  { value: 'system', label: 'System', description: 'Follow your OS preference', icon: LucideMonitor },
]

export function ThemeSelector() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  return (
    <Card className="glass border-border">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-black tracking-tight flex items-center gap-2">
          <LucidePalette className="h-5 w-5 text-primary/60" />
          Appearance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {themes.map((t) => (
          <button
            key={t.value}
            onClick={() => setTheme(t.value)}
            className={cn(
              'w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left',
              theme === t.value
                ? 'bg-primary/5 border-primary/20'
                : 'bg-surface border-border hover:bg-secondary'
            )}
          >
            <div className="flex items-center gap-3">
              <t.icon className={cn('h-4 w-4', theme === t.value ? 'text-primary' : 'text-muted-foreground')} />
              <div>
                <p className={cn('font-bold text-sm', theme === t.value ? 'text-foreground' : 'text-muted-foreground')}>
                  {t.label}
                </p>
                <p className="text-xs text-muted-foreground">{t.description}</p>
              </div>
            </div>
            {theme === t.value && (
              <span className="text-[9px] font-black uppercase tracking-widest text-primary border border-primary/30 px-2 py-1 rounded-full">
                Active
              </span>
            )}
          </button>
        ))}
      </CardContent>
    </Card>
  )
}
