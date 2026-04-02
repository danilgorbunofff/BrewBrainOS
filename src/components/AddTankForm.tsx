'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { SubmitButton } from '@/components/SubmitButton'
import { FormWithToast } from '@/components/FormWithToast'
import { LucidePlus } from 'lucide-react'
import { addTank } from '@/app/(app)/tanks/actions'

export function AddTankForm() {
  const [open, setOpen] = useState(false)

  // Note: AddTankForm was previously a Dialog, but the design pattern here
  // is often a floating bar as per the code earlier. 
  // I will stick to the FormWithToast version which is the most reliable.

  return (
    <FormWithToast 
      action={addTank} 
      successMessage="Vessel added successfully"
      resetOnSuccess
    >
      <div className="glass p-2 rounded-2xl flex flex-row items-center gap-2 border-white/10 glow-primary shadow-2xl">
        <Input name="name" placeholder="Tank ID" required className="bg-transparent border-none focus-visible:ring-0 w-32 font-bold" />
        <div className="h-6 w-px bg-white/10 mx-2" />
        <Input name="capacity" type="number" placeholder="BBL" className="bg-transparent border-none focus-visible:ring-0 w-20 font-mono" />
        <SubmitButton size="icon" className="shrink-0 aspect-square" pendingText="">
          <LucidePlus className="h-5 w-5" />
        </SubmitButton>
      </div>
    </FormWithToast>
  )
}
