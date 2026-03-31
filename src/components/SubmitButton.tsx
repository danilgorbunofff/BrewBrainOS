'use client'

import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { LucideLoader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SubmitButtonProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  pendingText?: string
  icon?: React.ReactNode
}

export function SubmitButton({
  children,
  className,
  variant = 'default',
  size = 'default',
  pendingText = 'Processing…',
  icon,
}: SubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      disabled={pending}
      className={cn('transition-all', className)}
    >
      {pending ? (
        <>
          <LucideLoader2 className="h-4 w-4 animate-spin mr-2" />
          {pendingText}
        </>
      ) : (
        <>
          {icon && <span className="mr-2">{icon}</span>}
          {children}
        </>
      )}
    </Button>
  )
}
