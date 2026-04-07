'use client'

import { useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ActionResult } from '@/types/database'

interface FormWithToastProps {
  children: React.ReactNode
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  action: (formData: FormData) => Promise<ActionResult | any>
  successMessage?: string
  errorMessage?: string
  resetOnSuccess?: boolean
  onSuccess?: () => void
  onBeforeSubmit?: () => void
  formRef?: React.RefObject<HTMLFormElement | null>
}

export function FormWithToast({
  children,
  action,
  successMessage = 'Saved successfully',
  errorMessage = 'Something went wrong',
  resetOnSuccess = true,
  onSuccess,
  onBeforeSubmit,
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
          toast.error(result.error || errorMessage)
        }
      } else {
        // Fallback for non-standard actions
        toast.success(successMessage)
        router.refresh()
      }
    } catch (err: unknown) {
      toast.error(err?.message || errorMessage)
    }
  }

  return (
    <form ref={formRef} action={handleAction}>
      {children}
    </form>
  )
}
