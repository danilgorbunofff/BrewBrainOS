'use client'

import { useId, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { SubmitButton } from '@/components/SubmitButton'
import { LucidePlus } from 'lucide-react'
import { addBatch } from '@/app/(app)/batches/actions'
import { toast } from 'sonner'

interface AddBatchFormProps {
  onSuccess?: () => void
  onOptimisticAdd?: (id: string, recipeName: string, og: number | null) => void
  onOptimisticRollback?: (id: string) => void
}

function parseOptionalOg(formData: FormData) {
  const rawOg = (formData.get('og') as string | null)?.trim()
  if (!rawOg) {
    return null
  }

  const parsed = Number.parseFloat(rawOg)
  return Number.isNaN(parsed) ? null : parsed
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

export function AddBatchForm({ onSuccess, onOptimisticAdd, onOptimisticRollback }: AddBatchFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()
  const recipeNameId = useId()
  const ogId = useId()

  const handleSubmit = async (formData: FormData) => {
    const recipeName = (formData.get('recipeName') as string | null)?.trim() || ''
    const optimisticId = crypto.randomUUID()
    const og = parseOptionalOg(formData)

    formData.set('id', optimisticId)

    if (recipeName) {
      onOptimisticAdd?.(optimisticId, recipeName, og)
    }

    try {
      const result = await addBatch(formData)
      if (!result.success) {
        onOptimisticRollback?.(optimisticId)
        toast.error(result.error || 'Failed to create batch')
        return
      }

      toast.success('Batch created successfully')
      formRef.current?.reset()
      router.refresh()
      onSuccess?.()
    } catch (error) {
      onOptimisticRollback?.(optimisticId)
      toast.error(getErrorMessage(error, 'Failed to create batch'))
    }
  }

  return (
    <form ref={formRef} action={handleSubmit}>
      <div className="glass p-2 rounded-2xl flex flex-row items-center gap-2 border-border glow-primary shadow-2xl">
        <label className="sr-only" htmlFor={recipeNameId}>Recipe name</label>
        <Input
          id={recipeNameId}
          name="recipeName"
          placeholder="Recipe Name"
          required
          className="bg-transparent border-none focus-visible:ring-0 w-36 font-bold"
        />
        <div className="h-6 w-px bg-secondary/50 mx-2" />
        <label className="sr-only" htmlFor={ogId}>Target original gravity</label>
        <Input
          id={ogId}
          name="og"
          type="number"
          step="0.001"
          placeholder="OG"
          className="bg-transparent border-none focus-visible:ring-0 w-20 font-mono"
        />
        <SubmitButton ariaLabel="Create batch" size="icon" className="shrink-0 aspect-square" pendingText="">
          <LucidePlus className="h-5 w-5" />
        </SubmitButton>
      </div>
    </form>
  )
}
