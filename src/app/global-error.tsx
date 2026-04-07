'use client'

import { useEffect } from 'react'
import { Outfit, Inter } from "next/font/google"
import { LucideAlertTriangle, LucideRefreshCcw } from 'lucide-react'
import "./globals.css"

const fontHeading = Outfit({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
})

const fontSans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
})

export default function GlobalError({
  error,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global Error Boundary caught error:', error)
  }, [error])

  return (
    <html
      lang="en"
      className={`${fontSans.variable} ${fontHeading.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <div className="min-h-screen w-full flex items-center justify-center p-6">
          <div className="max-w-md w-full relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">
            <div className="absolute inset-0 bg-red-500/10 blur-[100px] rounded-full" />
            
            <div className="relative bg-popover/80 backdrop-blur-3xl border border-red-500/20 p-8 rounded-3xl shadow-2xl flex flex-col items-center text-center">
              <div className="h-16 w-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                <LucideAlertTriangle className="h-8 w-8 text-red-500" />
              </div>
              
              <h1 className="text-2xl font-black text-foreground mb-2 tracking-tight">System Reboot Required</h1>
              <p className="text-sm text-muted-foreground mb-8 max-w-[280px]">
                A critical application error occurred. We need to clear your layout state to recover.
                <br /><br />
                <span className="font-mono text-[10px] opacity-50 bg-black/50 p-2 rounded block text-left overflow-hidden text-ellipsis whitespace-nowrap">
                  {error.message || 'Unknown deep layout error'}
                </span>
              </p>

              <button
                onClick={() => {
                  // Hard reload rather than transition for global crashes
                  window.location.reload()
                }}
                className="w-full h-12 flex items-center justify-center gap-3 bg-red-600 hover:bg-red-500 text-foreground rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:shadow-[0_0_30px_rgba(220,38,38,0.5)] border border-red-400/50"
              >
                <LucideRefreshCcw className="h-4 w-4" />
                Hard Refresh
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
