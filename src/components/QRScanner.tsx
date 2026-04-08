'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const QRCodeScanner = dynamic(
  () => import('@yudiel/react-qr-scanner').then((mod) => mod.Scanner),
  { ssr: false }
)

export function QRScanner() {
  const [isScanning, setIsScanning] = useState(false)
  const router = useRouter()
  const [isMounted, setIsMounted] = useState(false)

  // Explicit cleanup on unmount and delayed initialization
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true)
    
    // Desktop fix: delay acquisition to ensure previous stream is released
    const timer = setTimeout(() => {
      setIsScanning(true)
    }, 250)

    return () => {
      clearTimeout(timer)
      setIsScanning(false)
    }
  }, [])

  const handleScan = (detectedCodes: Array<{ rawValue: string }>) => {
    if (!isScanning || !detectedCodes.length) return
    
    // Grab the first detected code value
    const data = detectedCodes[0].rawValue

    if (data) {
      setIsScanning(false)
      
      try {
        // Handle absolute URL (e.g., https://app.brewbrain.io/tank/1234-abcd)
        if (data.includes('tank/')) {
          const tankIdMatch = data.match(/tank\/([a-zA-Z0-9-]+)/)
          if (tankIdMatch && tankIdMatch[1]) {
            toast.success('Tank recognized. Loading profile...')
            router.push(`/tank/${tankIdMatch[1]}`)
            return
          }
        }
        
        // Handle UUID just in case it's a raw database ID
        const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
        if (uuidRegex.test(data)) {
          toast.success('Tank recognized by ID. Loading profile...')
          router.push(`/tank/${data}`)
          return
        }

        // Unrecognized format
        toast.error('Invalid BrewBrain QR code detected.')
        setTimeout(() => setIsScanning(true), 2000)
      } catch {
        toast.error('Failed to parse QR code.')
        setTimeout(() => setIsScanning(true), 2000)
      }
    }
  }

  const handleError = (error: unknown) => {
    console.error('QR Scanner Error:', error)
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' && error.message.includes('Permission denied')) {
      toast.error('Camera permission denied. Please allow camera access.')
    }
  }

  return (
    <div className="relative mx-auto max-w-sm overflow-hidden rounded-2xl border border-zinc-800 bg-background aspect-square shadow-2xl">
      {isMounted && isScanning ? (
        <QRCodeScanner
          onScan={handleScan}
          onError={handleError}
          paused={!isScanning}
          formats={['qr_code']}
          styles={{
           container: { width: '100%', height: '100%' },
          }}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-card absolute inset-0 text-muted-foreground font-bold p-8 text-center animate-pulse">
          Processing...
        </div>
      )}
      
      {/* Decorative corners */}
      <div className="pointer-events-none absolute inset-0 z-10 border-4 border-orange-600/20 rounded-2xl"></div>
    </div>
  )
}
