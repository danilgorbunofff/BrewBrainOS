'use client'

import { createContext, useContext, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { LucideAlertTriangle, LucideLoader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ActionResult } from '@/types/database'

type DeleteActionResult =
  | ActionResult<unknown>
  | { success?: boolean; error?: string; data?: unknown }
  | boolean
  | null
  | undefined
  | void

export type DeleteAction = (formData: FormData) => Promise<DeleteActionResult>

interface DeleteConfirmRequest {
  action: DeleteAction
  hiddenInputs: Record<string, string>
  itemName: string
  title?: string
  description?: string
  onSuccess?: () => void
  onOptimisticDelete?: () => void
  redirectOnSuccess?: string
  refreshOnSuccess?: boolean
  successMessage?: string
}

interface DeleteConfirmContextValue {
  openDeleteConfirm: (request: DeleteConfirmRequest) => void
}

const DeleteConfirmContext = createContext<DeleteConfirmContextValue | null>(null)

function isNextRedirectError(error: unknown) {
  if (typeof error === 'string') {
    return error.includes('NEXT_REDIRECT')
  }

  if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
    return true
  }

  if (typeof error === 'object' && error !== null && 'digest' in error) {
    const digest = error.digest
    return typeof digest === 'string' && digest.includes('NEXT_REDIRECT')
  }

  return false
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  if (typeof error === 'string' && error.trim()) {
    return error
  }

  return fallback
}

function wasDeleteSuccessful(result: DeleteActionResult) {
  if (result === false) {
    return false
  }

  if (typeof result === 'object' && result !== null && 'success' in result) {
    return result.success !== false
  }

  return true
}

function getDeleteFailureMessage(result: DeleteActionResult, itemName: string) {
  if (typeof result === 'object' && result !== null && 'error' in result && typeof result.error === 'string') {
    return result.error
  }

  return `Failed to delete ${itemName}`
}

export function DeleteConfirmProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<DeleteConfirmRequest | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const openDeleteConfirm = (nextRequest: DeleteConfirmRequest) => {
    setRequest(nextRequest)
  }

  const closeDeleteConfirm = () => {
    if (!isPending) {
      setRequest(null)
    }
  }

  const handleDelete = () => {
    if (!request) {
      return
    }

    const currentRequest = request
    const formData = new FormData()

    Object.entries(currentRequest.hiddenInputs).forEach(([key, value]) => {
      formData.set(key, value)
    })

    startTransition(async () => {
      currentRequest.onOptimisticDelete?.()

      try {
        const result = await currentRequest.action(formData)

        if (!wasDeleteSuccessful(result)) {
          toast.error(getDeleteFailureMessage(result, currentRequest.itemName))
          return
        }

        toast.success(currentRequest.successMessage || `Deleted ${currentRequest.itemName}`)
        setRequest(null)
        currentRequest.onSuccess?.()

        if (currentRequest.redirectOnSuccess) {
          router.push(currentRequest.redirectOnSuccess)
          return
        }

        if (currentRequest.refreshOnSuccess) {
          router.refresh()
        }
      } catch (error: unknown) {
        if (isNextRedirectError(error)) {
          return
        }

        toast.error(getErrorMessage(error, `Failed to delete ${currentRequest.itemName}`))
      }
    })
  }

  return (
    <DeleteConfirmContext.Provider value={{ openDeleteConfirm }}>
      {children}
      <Dialog open={request !== null} onOpenChange={(open) => !open && closeDeleteConfirm()}>
        <DialogContent className="sm:max-w-[400px] glass border-border p-8">
          <DialogHeader className="space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
              <LucideAlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <div className="space-y-1 text-center">
              <DialogTitle className="text-2xl font-black tracking-tighter">
                {request?.title || 'Terminal Deletion'}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {request?.description || (request
                  ? `Are you absolutely certain you want to purge "${request.itemName}" from the central database? This action is irreversible.`
                  : '')}
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={closeDeleteConfirm}
              disabled={isPending}
            >
              Abort
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="flex-1 rounded-xl shadow-lg shadow-red-500/20"
              onClick={handleDelete}
              disabled={isPending || request === null}
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
    </DeleteConfirmContext.Provider>
  )
}

export function useDeleteConfirm() {
  const context = useContext(DeleteConfirmContext)

  if (!context) {
    throw new Error('useDeleteConfirm must be used within DeleteConfirmProvider')
  }

  return context
}