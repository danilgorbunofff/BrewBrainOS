'use client'

import { Button } from '@/components/ui/button'
import { LucidePrinter } from 'lucide-react'

export function PrintButton() {
  return (
    <Button 
      onClick={() => window.print()}
      className="gap-2 font-bold bg-primary text-black hover:bg-primary/90"
    >
      <LucidePrinter className="h-4 w-4" />
      Open Print Dialog
    </Button>
  )
}
