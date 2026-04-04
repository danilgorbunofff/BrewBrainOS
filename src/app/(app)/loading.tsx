import { LucideLayoutDashboard } from 'lucide-react'

export default function Loading() {
  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-8 pt-8 flex items-center justify-center">
      <div className="flex flex-col items-center gap-6 animate-in fade-in duration-700">
        <div className="relative group">
          {/* Animated glow */}
          <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
          
          <div className="relative h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-2xl">
            <div className="h-10 w-10 border-t-2 border-primary rounded-full animate-spin" />
            <span className="absolute text-xl font-black text-primary italic">B</span>
          </div>
        </div>
        
        <div className="space-y-2 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground animate-pulse">
            Synchronizing Production Data
          </p>
          <div className="flex gap-1 justify-center">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-1 w-4 rounded-full bg-primary/20 animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
