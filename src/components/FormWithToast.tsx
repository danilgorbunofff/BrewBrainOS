'use client'

import { useRef } from 'react'
import { toast } from 'sonner'

import { ActionResult } from '@/types/database'

interface ToastOnSubmitProps {
  children: React.ReactNode
  action: (formData: FormData) => Promise<ActionResult | any>
  successMessage?: string
  errorMessage?: string
  resetOnSuccess?: boolean
  onSuccess?: () => void
}

export function FormWithToast({
  children,
  action,
  successMessage = 'Saved successfully',
  errorMessage = 'Something went wrong',
  resetOnSuccess = true,
  onSuccess,
}: ToastOnSubmitProps) {
  const formRef = useRef<HTMLFormElement>(null)

  const handleAction = async (formData: FormData) => {
    try {
      const result = await action(formData)
      
      // Standardized ActionResult handling
      if (result && typeof result === 'object' && 'success' in result) {
        if (result.success) {
          toast.success(successMessage)
          if (resetOnSuccess && formRef.current) {
            formRef.current.reset()
          }
          if (onSuccess) onSuccess()
        } else {
          toast.error(result.error || errorMessage)
        }
      } else {
        // Fallback for non-standard actions
        toast.success(successMessage)
      }
    } catch (err: any) {
      toast.error(err?.message || errorMessage)
    }
  }

  return (
    <form ref={formRef} action={handleAction}>
      {children}
    </form>
  )
}
