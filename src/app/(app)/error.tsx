'use client'

import { useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { LucideAlertTriangle, LucideRefreshCcw } from 'lucide-react'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    // Log the error to an error reporting service
    console.error('App Error Boundary caught error:', error)
  }, [error])

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">
        <div className="absolute inset-0 bg-purple-500/10 blur-[100px] rounded-full" />
        
        <div className="relative bg-popover/80 backdrop-blur-3xl border border-purple-500/20 p-8 rounded-3xl shadow-2xl flex flex-col items-center text-center">
          <div className="h-16 w-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
            <LucideAlertTriangle className="h-8 w-8 text-red-400" />
          </div>
          
          <h1 className="text-2xl font-black text-foreground mb-2 tracking-tight">Something went wrong!</h1>
          <p className="text-sm text-muted-foreground mb-8 max-w-[280px]">
            {(error instanceof Error ? error.message : (error as { message?: string } | null)?.message) ||
              'An unexpected error occurred while loading your brewery data.'}
          </p>

          <button
            onClick={() => {
              startTransition(() => {
                reset()
                router.refresh()
              })
            }}
            disabled={isPending}
            className="w-full h-12 flex items-center justify-center gap-3 bg-purple-600 hover:bg-purple-500 text-foreground rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(147,51,234,0.3)] hover:shadow-[0_0_30px_rgba(147,51,234,0.5)] border border-purple-400/50"
          >
            <LucideRefreshCcw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
            {isPending ? 'Resetting...' : 'Reset Brewery Cache'}
          </button>
        </div>
      </div>
    </div>
  )
}
