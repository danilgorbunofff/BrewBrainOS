import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LucideArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center space-y-8 max-w-md animate-in fade-in slide-in-from-bottom-8 duration-700">
        {/* Big 404 */}
        <div className="relative">
          <p className="text-[150px] md:text-[200px] font-black tracking-tighter text-muted/50 leading-none select-none">
            404
          </p>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-20 w-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-[0_0_40px_rgba(245,158,11,0.15)]">
              <span className="text-4xl font-black text-primary italic">B</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-black tracking-tighter text-foreground">Signal Lost</h1>
          <p className="text-muted-foreground font-medium leading-relaxed">
            This page doesn&apos;t exist in the BrewBrain network. It may have been moved, deleted, or you might have an incorrect URL.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/dashboard">
            <Button className="gap-2 font-bold">
              <LucideArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" className="border-border font-bold">
              Landing Page
            </Button>
          </Link>
        </div>

        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">
          BrewBrain OS • Error 404
        </p>
      </div>
    </div>
  )
}
