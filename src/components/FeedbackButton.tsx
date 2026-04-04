'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { LucideMessageSquare, LucideX, LucideLoader2 } from 'lucide-react'
import { submitFeedback } from '@/app/actions/feedback'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const pathname = usePathname()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    
    const formData = new FormData(e.currentTarget)
    formData.append('url', pathname)
    
    const res = await submitFeedback(formData)
    
    if (res.success) {
      toast.success('Feedback sent! Thanks for your help.')
      setIsOpen(false)
      ;(e.target as HTMLFormElement).reset()
    } else {
      toast.error(res.error || 'Failed to send feedback.')
    }
    
    setIsSubmitting(false)
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="mb-4 w-80 bg-popover/90 backdrop-blur-xl border border-border shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <h3 className="text-sm font-black tracking-tight text-foreground">Report an Issue</h3>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <LucideX className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-3 font-medium">
                Find a bug or have a suggestion? Let us know below. This helps us improve the platform!
              </p>
              <textarea
                name="message"
                required
                placeholder="What went wrong?"
                className="w-full text-sm bg-surface border border-border rounded-xl p-3 min-h-[100px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary placeholder:text-muted-foreground/60 resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-foreground text-background font-bold h-10 rounded-xl flex items-center justify-center text-sm disabled:opacity-50 hover:bg-foreground/90 transition-colors"
            >
              {isSubmitting ? <LucideLoader2 className="h-4 w-4 animate-spin" /> : 'Send Feedback'}
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-12 w-12 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300",
          isOpen 
            ? "bg-secondary text-foreground border border-border rotate-12" 
            : "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105"
        )}
      >
        {isOpen ? <LucideX className="h-5 w-5" /> : <LucideMessageSquare className="h-5 w-5" />}
      </button>
    </div>
  )
}
