'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { LucideTrash2, LucideLoader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DeleteConfirmButtonProps {
  action: (formData: FormData) => Promise<void>
  hiddenInputs: Record<string, string>
  itemName: string
  className?: string
  size?: 'default' | 'sm' | 'icon' | 'icon-sm'
}

export function DeleteConfirmButton({
  action,
  hiddenInputs,
  itemName,
  className,
  size = 'icon-sm',
}: DeleteConfirmButtonProps) {
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = () => {
    const formData = new FormData()
    Object.entries(hiddenInputs).forEach(([key, value]) => {
      formData.set(key, value)
    })

    startTransition(async () => {
      try {
        await action(formData)
      } catch {
        // Error will propagate through Next error boundary
      }
      setConfirming(false)
    })
  }

  if (confirming) {
    return (
      <div className={cn('flex items-center gap-1.5 animate-in fade-in duration-200', className)}>
        <span className="text-[10px] font-black text-red-400 uppercase tracking-wider">Delete {itemName}?</span>
        <Button
          variant="destructive"
          size="sm"
          disabled={isPending}
          onClick={handleSubmit}
          className="h-7 px-2 text-xs rounded-lg"
        >
          {isPending ? <LucideLoader2 className="h-3 w-3 animate-spin" /> : 'Yes'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConfirming(false)}
          className="h-7 px-2 text-xs rounded-lg text-zinc-500"
        >
          No
        </Button>
      </div>
    )
  }

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={() => setConfirming(true)}
      className={cn('text-zinc-700 hover:text-red-500 hover:bg-red-500/10 transition-colors', className)}
      title={`Delete ${itemName}`}
    >
      <LucideTrash2 className="h-3.5 w-3.5" />
    </Button>
  )
}
