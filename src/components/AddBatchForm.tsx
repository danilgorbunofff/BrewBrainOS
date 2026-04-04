'use client'

import { Input } from '@/components/ui/input'
import { SubmitButton } from '@/components/SubmitButton'
import { FormWithToast } from '@/components/FormWithToast'
import { LucidePlus } from 'lucide-react'
import { addBatch } from '@/app/(app)/batches/actions'

export function AddBatchForm({ onSuccess }: { onSuccess?: () => void }) {
  return (
    <FormWithToast action={addBatch} successMessage="Batch created successfully" onSuccess={onSuccess}>
      <div className="glass p-2 rounded-2xl flex flex-row items-center gap-2 border-border glow-primary shadow-2xl">
        <Input name="recipeName" placeholder="Recipe Name" required className="bg-transparent border-none focus-visible:ring-0 w-36 font-bold" />
        <div className="h-6 w-px bg-secondary/50 mx-2" />
        <Input name="og" type="number" step="0.001" placeholder="OG" className="bg-transparent border-none focus-visible:ring-0 w-20 font-mono" />
        <SubmitButton size="icon" className="shrink-0 aspect-square" pendingText="">
          <LucidePlus className="h-5 w-5" />
        </SubmitButton>
      </div>
    </FormWithToast>
  )
}
