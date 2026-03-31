import { createClient } from '@/utils/supabase/server'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from 'next/link'
import { LogOut, Settings, User as UserIcon, Home, Bell } from 'lucide-react'
import { SignOutForm } from './SignOutForm'

export async function UserNav() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Get initials for avatar fallback
  const email = user.email || ''
  const initials = email.substring(0, 2).toUpperCase()

  return (
    <div className="fixed top-6 right-6 z-50 flex items-center gap-4">
      
      {/* Notifications Placeholder */}
      <button className="relative p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/10 glass cursor-pointer">
        <Bell className="w-5 h-5 text-zinc-400" />
        <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-primary rounded-full border-2 border-[#060606]"></span>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger>
          <button className="relative h-10 w-10 rounded-full ring-2 ring-primary/20 hover:ring-primary transition-all duration-300 focus:outline-none">
            <Avatar className="h-10 w-10 border border-white/10">
              <AvatarImage src="" alt={email} />
              <AvatarFallback className="bg-zinc-900 text-primary font-bold">{initials}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 mt-2 border-white/10 bg-[#0c0c0c]/95 backdrop-blur-xl text-zinc-200" align="end">
          <DropdownMenuLabel className="font-normal border-b border-white/5 pb-3">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none text-white">Active Session</p>
              <p className="text-xs leading-none text-zinc-500 font-mono mt-1">
                {email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuGroup className="py-2">
            <DropdownMenuItem className="cursor-pointer focus:bg-white/5 focus:text-white">
              <Link href="/dashboard" className="flex items-center w-full">
                <Home className="mr-2 h-4 w-4 text-zinc-400" />
                <span>Dashboard</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer focus:bg-white/5 focus:text-white">
              <Link href="/settings" className="flex items-center w-full">
                <Settings className="mr-2 h-4 w-4 text-zinc-400" />
                <span>Settings Hub</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator className="bg-white/5" />
          <DropdownMenuItem className="p-0">
             <SignOutForm />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
