'use client'

import { Input } from '@/components/ui/input'
import { SubmitButton } from '@/components/SubmitButton'
import { FormWithToast } from '@/components/FormWithToast'
import { LucidePlus } from 'lucide-react'
import { addTank } from '@/app/(app)/tanks/actions'

interface AddTankFormProps {
  onOptimisticAdd?: (id: string, name: string, capacity?: number) => void
}

export function AddTankForm({ onOptimisticAdd }: AddTankFormProps) {
  // Wrap the server action to intercept formData before sending
  const actionWithOptimistic = async (formData: FormData) => {
    const id = crypto.randomUUID()
    formData.set('id', id)
    const name = formData.get('name') as string
    const capRaw = formData.get('capacity') as string
    const capacity = capRaw ? parseFloat(capRaw) : undefined
    if (name) onOptimisticAdd?.(id, name, capacity)
    return addTank(formData)
  }

  return (
    <FormWithToast
      action={actionWithOptimistic}
      successMessage="Vessel added successfully"
      resetOnSuccess
    >
      <div className="glass p-2 rounded-2xl flex flex-row items-center gap-2 border-border glow-primary shadow-2xl">
        <Input name="name" placeholder="Tank ID" required className="bg-transparent border-none focus-visible:ring-0 w-32 font-bold" />
        <div className="h-6 w-px bg-secondary/50 mx-2" />
        <Input name="capacity" type="number" placeholder="BBL" className="bg-transparent border-none focus-visible:ring-0 w-20 font-mono" />
        <SubmitButton size="icon" className="shrink-0 aspect-square" pendingText="">
          <LucidePlus className="h-5 w-5" />
        </SubmitButton>
      </div>
    </FormWithToast>
  )
}
