import { QRScanner } from '@/components/QRScanner'
import { LucideQrCode } from 'lucide-react'
import Link from 'next/link'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Scan Tank | BrewBrain',
}

export default async function ScanPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 text-foreground font-sans">
      <div className="w-full max-w-md text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-950/30 border border-orange-900/50 shadow-[0_0_30px_rgba(234,88,12,0.15)]">
          <LucideQrCode className="h-8 w-8 text-orange-600" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight">Scan Equipment</h1>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            Point your camera at any BrewBrain waterproof floor label to log sanitation or fetch batch data.
          </p>
        </div>

        <div className="mt-8">
          <QRScanner />
        </div>

        <div className="pt-8">
          <Link href="/dashboard" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
            &larr; Return to Dashboard
          </Link>
        </div>

      </div>
    </div>
  )
}
