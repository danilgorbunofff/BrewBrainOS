'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { LucideCheck, LucideX, LucideRocket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface OnboardingStep {
  id: string
  label: string
  href: string
  completed: boolean
}

interface OnboardingChecklistProps {
  hasBrewery: boolean
  hasTanks: boolean
  hasBatches: boolean
  hasInventory: boolean
}

export function OnboardingChecklist({ hasBrewery, hasTanks, hasBatches, hasInventory }: OnboardingChecklistProps) {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('brewbrain_onboarding_dismissed')
    if (stored === 'true') setDismissed(true)
  }, [])

  const steps: OnboardingStep[] = [
    { id: 'brewery', label: 'Create your brewery', href: '/dashboard', completed: hasBrewery },
    { id: 'tanks', label: 'Add your first tank', href: '/tanks', completed: hasTanks },
    { id: 'batches', label: 'Start a batch', href: '/batches', completed: hasBatches },
    { id: 'inventory', label: 'Track an ingredient', href: '/inventory', completed: hasInventory },
  ]

  const completedCount = steps.filter(s => s.completed).length
  const allComplete = completedCount === steps.length
  const progress = (completedCount / steps.length) * 100

  if (dismissed || allComplete) return null

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem('brewbrain_onboarding_dismissed', 'true')
  }

  return (
    <div className="glass rounded-2xl p-6 border-primary/20 bg-primary/[0.02] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <LucideRocket className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-black text-foreground tracking-tight">Getting Started</h3>
            <p className="text-xs text-muted-foreground font-medium">{completedCount}/{steps.length} steps completed</p>
          </div>
        </div>
        <button onClick={handleDismiss} className="p-1 rounded-lg hover:bg-secondary transition-colors">
          <LucideX className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden mb-5">
        <div
          className="h-full bg-primary rounded-full transition-all duration-700"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="space-y-2">
        {steps.map(step => (
          <Link
            key={step.id}
            href={step.href}
            className={cn(
              'flex items-center gap-3 p-3 rounded-xl transition-all',
              step.completed
                ? 'opacity-50'
                : 'hover:bg-secondary border border-transparent hover:border-primary/10'
            )}
          >
            <div className={cn(
              'h-6 w-6 rounded-full flex items-center justify-center shrink-0 border transition-colors',
              step.completed
                ? 'bg-green-500/20 border-green-500/30 text-green-400'
                : 'bg-secondary border-border text-muted-foreground'
            )}>
              {step.completed && <LucideCheck className="h-3 w-3" />}
            </div>
            <span className={cn(
              'text-sm font-bold',
              step.completed ? 'text-muted-foreground line-through' : 'text-foreground'
            )}>
              {step.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
