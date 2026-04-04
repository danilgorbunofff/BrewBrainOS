'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { LucideSun, LucideMoon } from 'lucide-react'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className={className} disabled>
        <LucideMoon className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className={className}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <LucideSun className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
      ) : (
        <LucideMoon className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
      )}
    </Button>
  )
}
