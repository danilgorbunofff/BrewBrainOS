'use client'

import { useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ActionResult } from '@/types/database'

interface FormWithToastProps {
  children: React.ReactNode
  action: (formData: FormData) => Promise<ActionResult<unknown> | void | null | undefined>
  successMessage?: string
  errorMessage?: string
  resetOnSuccess?: boolean
  onSuccess?: () => void
  onBeforeSubmit?: () => void
  onError?: (message: string) => void
  formRef?: React.RefObject<HTMLFormElement | null>
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  if (typeof error === 'string' && error.trim().length > 0) {
    return error
  }

  return fallback
}

export function FormWithToast({
  children,
  action,
  successMessage = 'Saved successfully',
  errorMessage = 'Something went wrong',
  resetOnSuccess = true,
  onSuccess,
  onBeforeSubmit,
  onError,
  formRef: externalRef,
}: FormWithToastProps) {
  const internalRef = useRef<HTMLFormElement>(null)
  const formRef = externalRef ?? internalRef
  const router = useRouter()

  const handleAction = async (formData: FormData) => {
    onBeforeSubmit?.()

    try {
      const result = await action(formData)

      // Standardized ActionResult handling
      if (result && typeof result === 'object' && 'success' in result) {
        if (result.success) {
          toast.success(successMessage)
          if (resetOnSuccess && formRef.current) {
            formRef.current.reset()
          }
          // Re-fetch server data so the UI updates immediately
          router.refresh()
          if (onSuccess) onSuccess()
        } else {
          const message = result.error || errorMessage
          toast.error(message)
          onError?.(message)
        }
      } else {
        // Fallback for non-standard actions
        toast.success(successMessage)
        router.refresh()
      }
    } catch (err: unknown) {
      const message = getErrorMessage(err, errorMessage)
      toast.error(message)
      onError?.(message)
    }
  }

  return (
    <form ref={formRef} action={handleAction}>
      {children}
    </form>
  )
}
