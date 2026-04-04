'use client'

import { LogOut } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export function SignOutForm() {
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.refresh()
    router.push('/login')
  }

  return (
    <button 
      onClick={handleSignOut}
      className="flex w-full cursor-pointer items-center px-2 py-1.5 text-sm text-red-500 hover:text-red-400 hover:bg-secondary rounded-sm transition-colors"
    >
      <LogOut className="mr-2 h-4 w-4" />
      <span>Log out session</span>
    </button>
  )
}
