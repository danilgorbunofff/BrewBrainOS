'use client'

import { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { LucideLink } from 'lucide-react'

interface Batch {
  id: string
  recipe_name: string | null
  status: string | null
}

interface AssignBatchSelectProps {
  tankId: string
  batches: Batch[]
  action: (formData: FormData) => Promise<void>
}

export function AssignBatchSelect({ tankId, batches, action }: AssignBatchSelectProps) {
  const [selectedBatchId, setSelectedBatchId] = useState('')

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="tankId" value={tankId} />
      <input type="hidden" name="batchId" value={selectedBatchId} />
      <Select value={selectedBatchId} onValueChange={(v) => v && setSelectedBatchId(v)}>
        <SelectTrigger className="w-full h-auto rounded-xl bg-secondary border-border text-foreground font-bold px-4 py-2.5 text-sm">
          <SelectValue placeholder="Select batch to assign…" />
        </SelectTrigger>
        <SelectContent className="glass border-border text-foreground">
          {batches.map(b => (
            <SelectItem key={b.id} value={b.id}>
              {b.recipe_name} ({b.status})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="submit"
        className="w-full rounded-xl gap-2"
        disabled={!selectedBatchId}
      >
        <LucideLink className="h-4 w-4" />
        Assign Batch to Tank
      </Button>
    </form>
  )
}
