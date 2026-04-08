'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { LucideShieldCheck, LucideX, LucideSettings, LucideCheck } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // Cookie Settings State
  const [settings, setSettings] = useState({
    necessary: true, // Always true
    analytics: true,
    marketing: false,
  })

  useEffect(() => {
    // Commented out for testing purposes - will appear on every refresh
    // const consent = localStorage.getItem('brewbrain_cookie_consent')
    // if (!consent) {
    const timer = setTimeout(() => setIsVisible(true), 1500)
    return () => clearTimeout(timer)
    // }
  }, [])

  const handleAcceptAll = () => {
    localStorage.setItem('brewbrain_cookie_consent', JSON.stringify({
      necessary: true,
      analytics: true,
      marketing: true,
    }))
    setIsVisible(false)
  }

  const handleSaveSettings = () => {
    localStorage.setItem('brewbrain_cookie_consent', JSON.stringify(settings))
    setIsVisible(false)
    setShowSettings(false)
  }

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 100, delay: 0.5 }}
            className="fixed bottom-6 left-6 right-6 md:left-auto md:max-w-md z-[100]"
          >
            <div className="relative overflow-hidden rounded-2xl border border-border bg-[#0a0a0a]/90 backdrop-blur-3xl p-6 shadow-2xl shadow-black">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-600 to-orange-900" />
              
              <button 
                onClick={() => setIsVisible(false)}
                aria-label="Close cookie consent"
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
              >
                <LucideX className="h-4 w-4" />
              </button>

              <div className="flex gap-4">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-orange-600/10 flex items-center justify-center border border-orange-600/20">
                  <LucideShieldCheck className="h-5 w-5 text-orange-500" />
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-foreground uppercase tracking-wider">Privacy Preference</h4>
                    <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                      We use cookies to optimize the brewery floor experience. Choose your level of logging below.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button 
                      onClick={handleAcceptAll}
                      className="h-9 px-6 text-xs font-black bg-orange-600 hover:bg-orange-500 transition-colors"
                    >
                      Accept All
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setShowSettings(true)}
                      className="h-9 px-4 text-xs font-bold border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
                    >
                      Customize
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-[425px] bg-[#0a0a0a] border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tighter uppercase tracking-[0.2em] text-orange-500">Cookie Settings</DialogTitle>
            <DialogDescription className="text-muted-foreground font-medium">
              Manage your privacy preferences for BrewBrain OS. Some cookies are essential for brewery operations.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-6">
            {/* Necessary */}
            <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-border bg-surface opacity-80">
              <div className="space-y-1">
                <p className="text-sm font-bold">Essential Operations</p>
                <p className="text-xs text-muted-foreground">Required for session management, security, and real-time floor updates. Cannot be disabled.</p>
              </div>
              <div className="relative inline-flex h-6 w-11 shrink-0 cursor-not-allowed rounded-full border-2 border-transparent bg-card transition-colors duration-200">
                <span className="pointer-events-none inline-block h-5 w-5 translate-x-5 transform rounded-full bg-muted-foreground/50 shadow ring-0 transition duration-200" />
              </div>
            </div>

            {/* Analytics */}
            <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-border bg-surface">
              <div className="space-y-1">
                <p className="text-sm font-bold">Brewery Analytics</p>
                <p className="text-xs text-muted-foreground">Helps us understand how you use the floor dashboard to improve our UI.</p>
              </div>
              <button 
                role="switch"
                aria-checked={settings.analytics}
                aria-label="Toggle brewery analytics"
                onClick={() => setSettings(s => ({ ...s, analytics: !s.analytics }))}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${settings.analytics ? 'bg-orange-600' : 'bg-muted-foreground/40'}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.analytics ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Marketing */}
            <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-border bg-surface">
              <div className="space-y-1">
                <p className="text-sm font-bold">Partners & Marketing</p>
                <p className="text-xs text-muted-foreground">Allows us to show you relevant brewery equipment and yeast partner offers.</p>
              </div>
              <button 
                role="switch"
                aria-checked={settings.marketing}
                aria-label="Toggle partners and marketing"
                onClick={() => setSettings(s => ({ ...s, marketing: !s.marketing }))}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${settings.marketing ? 'bg-orange-600' : 'bg-muted-foreground/40'}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.marketing ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>

          <DialogFooter>
            <Button 
              className="w-full bg-orange-600 hover:bg-orange-500 font-black h-12"
              onClick={handleSaveSettings}
            >
              SAVE MY PREFERENCES
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
