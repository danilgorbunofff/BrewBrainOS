'use client'

import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function SignOutForm() {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)

  async function handleSignOut() {
    if (isPending) {
      return
    }

    setIsPending(true)

    try {
      const response = await fetch('/api/auth/signout', {
        method: 'POST',
        headers: {
          accept: 'application/json',
        },
        cache: 'no-store',
      })

      const payload = await response.json().catch(() => null) as { error?: string; redirectTo?: string } | null

      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to sign out right now.')
      }

      toast.success('Signed out successfully.')
      router.replace(payload?.redirectTo || '/login')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to sign out right now.')
      setIsPending(false)
    }
  }

  return (
    <button
      onClick={handleSignOut}
      type="button"
      disabled={isPending}
      aria-busy={isPending}
      className="flex w-full cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm text-red-500 transition-colors hover:bg-secondary hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <LogOut className="mr-2 h-4 w-4" />
      <span>{isPending ? 'Signing out...' : 'Log out session'}</span>
    </button>
  )
}
