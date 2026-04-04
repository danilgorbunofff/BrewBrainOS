'use client'

import { useActionState } from 'react'
import { setupBrewery } from '@/app/(app)/dashboard/actions'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { LucideAlertCircle, LucideLoader2 } from 'lucide-react'

export function InitializeBreweryForm() {
  const [state, formAction, isPending] = useActionState(
    async (prevState: any, formData: FormData) => {
      return await setupBrewery(formData)
    },
    null
  )

  return (
    <div className="space-y-4">
      <form action={formAction} className="flex flex-col gap-4">
        <Input 
          name="name" 
          placeholder="Official Brewery Name" 
          required 
          disabled={isPending}
          className="text-center h-14 text-lg font-bold bg-secondary border-border focus:border-primary/50 transition-all" 
        />
        <Button 
          type="submit" 
          size="lg" 
          disabled={isPending}
          className="h-14 text-lg font-black shadow-[0_0_20px_rgba(234,88,12,0.2)] hover:shadow-[0_0_30px_rgba(234,88,12,0.4)] transition-all"
        >
          {isPending ? (
            <>
              <LucideLoader2 className="mr-2 h-5 w-5 animate-spin" />
              Initializing...
            </>
          ) : (
            'Confirm Initialization'
          )}
        </Button>
      </form>

      {state?.error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <LucideAlertCircle className="h-4 w-4 shrink-0" />
          <p className="font-medium text-left">{state.error}</p>
        </div>
      )}
    </div>
  )
}
