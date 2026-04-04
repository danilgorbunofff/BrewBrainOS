'use client'

import { useState, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { LucideTrash2, LucideLoader2, LucideAlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface DeleteConfirmDialogProps {
  action: (formData: FormData) => Promise<any>
  hiddenInputs: Record<string, string>
  itemName: string
  className?: string
  trigger?: React.ReactElement
  title?: string
  description?: string
  onSuccess?: () => void
  redirectOnSuccess?: string
}

export function DeleteConfirmDialog({
  action,
  hiddenInputs,
  itemName,
  className,
  trigger,
  title,
  description,
  onSuccess,
  redirectOnSuccess,
}: DeleteConfirmDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleDelete = () => {
    const formData = new FormData()
    Object.entries(hiddenInputs).forEach(([key, value]) => {
      formData.set(key, value)
    })

    startTransition(async () => {
      try {
        const result = await action(formData)
        
        // Handle both simple success and object results
        const isSuccess = result === true || (result && typeof result === 'object' && result.success !== false)
        
        if (isSuccess) {
          toast.success(`Permanently deleted ${itemName}`)
          setOpen(false)
          
          if (onSuccess) onSuccess()
          if (redirectOnSuccess) {
            router.push(redirectOnSuccess)
          } else {
            router.refresh()
          }
        } else {
          toast.error(result?.error || `Failed to delete ${itemName}`)
        }
      } catch (err: any) {
        if (err.message?.includes('NEXT_REDIRECT') || err.digest?.includes('NEXT_REDIRECT')) return
        toast.error(err.message || 'Systems failure during deletion protocols')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger || (
            <Button
              variant="ghost"
              size="icon-xs"
              className={cn(
                'text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors shrink-0',
                className
              )}
              title={`Delete ${itemName}`}
            >
              <LucideTrash2 className="h-3.5 w-3.5" />
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-[400px] glass border-border p-8">
        <DialogHeader className="space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
            <LucideAlertTriangle className="h-6 w-6 text-red-500" />
          </div>
          <div className="space-y-1 text-center">
            <DialogTitle className="text-2xl font-black tracking-tighter">
              {title || 'Terminal Deletion'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {description || `Are you absolutely certain you want to purge "${itemName}" from the central database? This action is irreversible.`}
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogFooter className="mt-4 gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1 rounded-xl"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Abort
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="flex-1 rounded-xl shadow-lg shadow-red-500/20"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending ? (
              <LucideLoader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Confirm Purge'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
