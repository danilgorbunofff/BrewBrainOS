'use client'

import { cloneElement } from 'react'
import { Button } from '@/components/ui/button'
import { LucideTrash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DeleteAction, useDeleteConfirm } from '@/components/DeleteConfirmProvider'

interface DeleteConfirmDialogProps {
  action: DeleteAction
  hiddenInputs: Record<string, string>
  itemName: string
  className?: string
  trigger?: React.ReactElement<{ onClick?: (event: React.MouseEvent<HTMLElement>) => void }>
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
  const { openDeleteConfirm } = useDeleteConfirm()

  const triggerElement = trigger || (
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

  return cloneElement(triggerElement, {
    onClick: (event: React.MouseEvent<HTMLElement>) => {
      triggerElement.props.onClick?.(event)

      if (event.defaultPrevented) {
        return
      }

      openDeleteConfirm({
        action,
        hiddenInputs,
        itemName,
        title,
        description,
        onSuccess,
        redirectOnSuccess,
        refreshOnSuccess: !redirectOnSuccess,
        successMessage: `Permanently deleted ${itemName}`,
      })
    },
  })
}
