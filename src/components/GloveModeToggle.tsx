'use client'

import { useGloveMode } from '@/components/GloveModeProvider'
import { Button } from '@/components/ui/button'
import { Hand } from 'lucide-react'
import { useHasMounted } from '@/lib/hooks'

export function GloveModeToggle({ className }: { className?: string }) {
  const { isGloveMode, toggleGloveMode } = useGloveMode()
  const mounted = useHasMounted()

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className={className} disabled>
        <Hand className="h-4 w-4 opacity-50" />
      </Button>
    )
  }

  return (
    <Button
      variant={isGloveMode ? 'secondary' : 'ghost'}
      size="icon"
      onClick={toggleGloveMode}
      className={className}
      title={`Turn ${isGloveMode ? 'off' : 'on'} Glove Mode (larger buttons)`}
    >
      <Hand className={`h-4 w-4 transition-colors ${isGloveMode ? 'text-foreground' : 'text-muted-foreground'}`} />
    </Button>
  )
}
