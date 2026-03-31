'use client'

import { useRef } from 'react'
import { toast } from 'sonner'

interface ToastOnSubmitProps {
  children: React.ReactNode
  action: (formData: FormData) => Promise<void>
  successMessage?: string
  errorMessage?: string
  resetOnSuccess?: boolean
}

export function FormWithToast({
  children,
  action,
  successMessage = 'Saved successfully',
  errorMessage = 'Something went wrong',
  resetOnSuccess = true,
}: ToastOnSubmitProps) {
  const formRef = useRef<HTMLFormElement>(null)

  const handleAction = async (formData: FormData) => {
    try {
      await action(formData)
      toast.success(successMessage)
      if (resetOnSuccess && formRef.current) {
        formRef.current.reset()
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
