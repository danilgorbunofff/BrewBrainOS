'use client'

import { Button } from '@/components/ui/button'
import { LucideTrash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DeleteAction, useDeleteConfirm } from '@/components/DeleteConfirmProvider'

interface DeleteConfirmButtonProps {
  action: DeleteAction
  hiddenInputs: Record<string, string>
  itemName: string
  className?: string
  size?: 'default' | 'sm' | 'icon' | 'icon-sm'
  onOptimisticDelete?: () => void
  redirectOnSuccess?: string
  label?: string
  buttonVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
}

export function DeleteConfirmButton({
  action,
  hiddenInputs,
  itemName,
  className,
  size = 'icon-sm',
  onOptimisticDelete,
  redirectOnSuccess,
  label,
  buttonVariant = 'ghost',
}: DeleteConfirmButtonProps) {
  const { openDeleteConfirm } = useDeleteConfirm()

  return (
    <Button
      variant={buttonVariant}
      size={size}
      aria-label={label ? undefined : `Delete ${itemName}`}
      onClick={() => {
        openDeleteConfirm({
          action,
          hiddenInputs,
          itemName,
          onOptimisticDelete,
          redirectOnSuccess,
          refreshOnSuccess: false,
          successMessage: `Deleted ${itemName}`,
        })
      }}
      className={cn('text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors', className)}
      title={`Delete ${itemName}`}
    >
      <LucideTrash2 className={cn('h-3.5 w-3.5', label && 'mr-2')} />
      {label && <span>{label}</span>}
    </Button>
  )
}
