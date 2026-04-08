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
 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      <button className="relative p-2 rounded-full bg-secondary hover:bg-secondary/50 transition-colors border border-border glass cursor-pointer">
        <Bell className="w-5 h-5 text-muted-foreground" />
        <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background"></span>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger>
          <button aria-label="Open user menu" className="relative h-10 w-10 rounded-full ring-2 ring-primary/20 hover:ring-primary transition-all duration-300 focus:outline-none">
            <Avatar className="h-10 w-10 border border-border">
              <AvatarImage src="" alt={email} />
              <AvatarFallback className="bg-card text-primary font-bold">{initials}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 mt-2 border-border bg-popover/95 backdrop-blur-xl text-popover-foreground" align="end">
          <DropdownMenuLabel className="font-normal border-b border-border pb-3">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none text-foreground">Active Session</p>
              <p className="text-xs leading-none text-muted-foreground font-mono mt-1">
                {email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuGroup className="py-2">
            <DropdownMenuItem className="cursor-pointer focus:bg-secondary focus:text-foreground">
              <Link href="/dashboard" className="flex items-center w-full">
                <Home className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Dashboard</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer focus:bg-secondary focus:text-foreground">
              <Link href="/settings" className="flex items-center w-full">
                <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Settings Hub</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator className="bg-secondary" />
          <DropdownMenuItem className="p-0">
             <SignOutForm />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
