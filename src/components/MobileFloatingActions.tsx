'use client'

import { useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import {
  LucideMic, LucideSquare, LucideLoader2, LucideQrCode,
  LucideX, LucideCheck, LucideThermometer, LucideFlaskConical,
  LucideStickyNote, LucideRotateCcw
} from 'lucide-react'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { transcribeVoiceLog, saveVoiceLog } from '@/app/actions/voiceModal'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { enqueueAction } from '@/lib/offlineQueue'

const QRCodeScanner = dynamic(
  () => import('@yudiel/react-qr-scanner').then((mod) => mod.Scanner),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center bg-card text-sm font-bold text-muted-foreground">
        Starting camera...
      </div>
    )
  }
)

type VoiceStep = 'idle' | 'recording' | 'processing' | 'review'

interface ExtractedData {
  transcript?: string | null
  temperature?: number | null
  gravity?: number | null
  batch_id?: string | null
  notes?: string | null
}

export function MobileFloatingActions() {
  const router = useRouter()
  const [showQR, setShowQR] = useState(false)

  // Voice modal state
  const [voiceStep, setVoiceStep] = useState<VoiceStep>('idle')
  const [showVoiceModal, setShowVoiceModal] = useState(false)
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  // ── Voice Recording ──
  const openVoiceModal = () => {
    setShowVoiceModal(true)
    setVoiceStep('idle')
    setExtractedData(null)
    startRecording()
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorderRef.current = recorder
      recorder.start(200)
      setVoiceStep('recording')
    } catch {
      toast.error('Microphone access denied')
      setShowVoiceModal(false)
      setVoiceStep('idle')
    }
  }

  const stopRecording = async () => {
    const recorder = mediaRecorderRef.current
    if (!recorder || voiceStep !== 'recording') return

    setVoiceStep('processing')

    // Create a promise that resolves when the recorder stops and data is available
    const audioBlob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        resolve(blob)
      }
      recorder.stop()
      recorder.stream.getTracks().forEach(track => track.stop())
    })

    mediaRecorderRef.current = null

    if (!navigator.onLine) {
      try {
        await enqueueAction({
          type: 'voice-log',
          payload: audioBlob
        })
        toast.success('Saved offline. Will sync when connection is restored.')
        closeVoiceModal()
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (err) {
        toast.error('Failed to save log offline')
        setVoiceStep('idle')
      }
      return
    }

    // Send to AI for transcription
    try {
      const audioFile = new File([audioBlob], 'voice-log.webm', { type: 'audio/webm' })
      const formData = new FormData()
      formData.append('audio', audioFile)

      const result = await transcribeVoiceLog(formData)

      if (result?.success && result.data) {
        setExtractedData(result.data)
        setVoiceStep('review')
      } else {
        toast.error(result?.error || 'Failed to process audio')
        setVoiceStep('idle')
        setShowVoiceModal(false)
      }
    } catch {
      toast.error('Failed to process audio')
      setVoiceStep('idle')
      setShowVoiceModal(false)
    }
  }

  const confirmAndSave = async () => {
    if (!extractedData) return
    setIsSaving(true)

    try {
      const result = await saveVoiceLog({
        temperature: extractedData.temperature ?? null,
        gravity: extractedData.gravity ?? null,
        notes: extractedData.notes ?? null,
        batch_id: extractedData.batch_id ?? null,
      })

      if (result?.success) {
        toast.success('Reading saved successfully')
        closeVoiceModal()
      } else {
        toast.error(result?.error || 'Failed to save reading')
      }
    } catch {
      toast.error('Failed to save reading')
    } finally {
      setIsSaving(false)
    }
  }

  const retryRecording = () => {
    setExtractedData(null)
    setVoiceStep('idle')
    startRecording()
  }

  const closeVoiceModal = () => {
    // Stop recording if active
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
      mediaRecorderRef.current = null
    }
    setShowVoiceModal(false)
    setVoiceStep('idle')
    setExtractedData(null)
  }

  // ── QR Scanner ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleScan = (detectedCodes: any[]) => {
    if (!detectedCodes.length) return
    const data = detectedCodes[0].rawValue
    if (!data) return

    setShowQR(false)

    if (data.includes('tank/')) {
      const match = data.match(/tank\/([a-zA-Z0-9-]+)/)
      if (match?.[1]) {
        toast.success('Tank recognized. Loading profile...')
        router.push(`/tank/${match[1]}`)
        return
      }
    }

    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
    if (uuidRegex.test(data)) {
      toast.success('Tank recognized by ID. Loading profile...')
      router.push(`/tank/${data}`)
      return
    }

    toast.error('Invalid BrewBrain QR code detected.')
  }

  return (
    <>
      {/* ── Floating action buttons ── */}
      <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-50 md:hidden flex flex-row items-center gap-3">
        <button
          onClick={() => setShowQR(true)}
          className="h-12 w-12 rounded-full bg-card/90 backdrop-blur-xl border border-border flex items-center justify-center shadow-lg shadow-black/40 active:scale-95 transition-all"
          aria-label="Scan QR Code"
        >
          <LucideQrCode className="h-5 w-5 text-muted-foreground" />
        </button>

        <button
          onClick={openVoiceModal}
          className="h-12 w-12 rounded-full bg-primary/90 backdrop-blur-xl border border-primary/30 shadow-[0_0_20px_rgba(245,158,11,0.2)] flex items-center justify-center shadow-lg active:scale-95 transition-all"
          aria-label="Voice Command"
        >
          <LucideMic className="h-5 w-5 text-black" />
        </button>
      </div>

      {/* ── Voice Recording Modal ── */}
      {showVoiceModal && (
        <div className="fixed inset-0 z-[60] md:hidden flex flex-col bg-background backdrop-blur-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-black text-foreground tracking-tight">Voice Log</h2>
            <button
              onClick={closeVoiceModal}
              className="h-10 w-10 rounded-full bg-secondary/50 flex items-center justify-center"
            >
              <LucideX className="h-5 w-5 text-foreground" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto">

            {/* ── Recording State ── */}
            {voiceStep === 'recording' && (
              <div className="flex flex-col items-center gap-8 animate-in fade-in duration-500">
                {/* Animated recording indicator */}
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping scale-150" />
                  <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse scale-125" />
                  <div className="relative h-28 w-28 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center">
                    <LucideMic className="h-12 w-12 text-primary" />
                  </div>
                </div>

                <div className="text-center space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary animate-pulse">
                    Recording
                  </p>
                  <p className="text-base font-bold text-muted-foreground">
                    Speak your production reading...
                  </p>
                  <p className="text-xs text-muted-foreground italic">
                    &quot;Gravity 1.012, temperature 68, looking clear&quot;
                  </p>
                </div>

                <button
                  onClick={stopRecording}
                  className="h-16 w-16 rounded-full bg-red-500/90 border-2 border-red-400/30 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.3)] active:scale-95 transition-all"
                >
                  <LucideSquare className="h-6 w-6 text-foreground fill-foreground" />
                </button>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Tap to stop
                </p>
              </div>
            )}

            {/* ── Processing State ── */}
            {voiceStep === 'processing' && (
              <div className="flex flex-col items-center gap-6 animate-in fade-in duration-500">
                <div className="relative h-28 w-28">
                  <div className="absolute inset-0 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <LucideLoader2 className="h-10 w-10 text-primary animate-spin" style={{ animationDirection: 'reverse', animationDuration: '3s' }} />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                    Analyzing
                  </p>
                  <p className="text-base font-bold text-muted-foreground">
                    BrewBrain AI is extracting data...
                  </p>
                </div>
              </div>
            )}

            {/* ── Review State ── */}
            {voiceStep === 'review' && extractedData && (
              <div className="w-full max-w-sm space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Transcript */}
                {extractedData.transcript && (
                  <div className="rounded-2xl border border-border bg-surface p-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                      What you said
                    </p>
                    <p className="text-sm font-medium text-foreground leading-relaxed italic">
                      &ldquo;{extractedData.transcript}&rdquo;
                    </p>
                  </div>
                )}

                {/* Extracted Metrics */}
                <div className="space-y-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground px-1">
                    Extracted Data
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Gravity */}
                    <div className={cn(
                      "rounded-xl border p-3",
                      extractedData.gravity != null
                        ? "border-primary/20 bg-primary/5"
                        : "border-border bg-surface"
                    )}>
                      <div className="flex items-center gap-2 mb-1">
                        <LucideFlaskConical className="h-3.5 w-3.5 text-primary/60" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Gravity</span>
                      </div>
                      <p className={cn(
                        "font-mono font-black text-xl tracking-tighter",
                        extractedData.gravity != null ? "text-primary" : "text-muted-foreground"
                      )}>
                        {extractedData.gravity?.toFixed(3) ?? '—'}
                      </p>
                    </div>

                    {/* Temperature */}
                    <div className={cn(
                      "rounded-xl border p-3",
                      extractedData.temperature != null
                        ? "border-blue-400/20 bg-blue-400/5"
                        : "border-border bg-surface"
                    )}>
                      <div className="flex items-center gap-2 mb-1">
                        <LucideThermometer className="h-3.5 w-3.5 text-blue-400/60" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Temp</span>
                      </div>
                      <p className={cn(
                        "font-mono font-black text-xl tracking-tighter",
                        extractedData.temperature != null ? "text-blue-400" : "text-muted-foreground"
                      )}>
                        {extractedData.temperature != null ? `${extractedData.temperature}°` : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Notes */}
                  {extractedData.notes && (
                    <div className="rounded-xl border border-border bg-surface p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <LucideStickyNote className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Notes</span>
                      </div>
                      <p className="text-sm text-muted-foreground font-medium">
                        {extractedData.notes}
                      </p>
                    </div>
                  )}

                  {/* Batch ID */}
                  {extractedData.batch_id && (
                    <div className="rounded-xl border border-border bg-surface p-3">
                      <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Batch: </span>
                      <span className="text-sm text-muted-foreground font-mono font-bold">{extractedData.batch_id}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={retryRecording}
                    className="flex-1 h-12 rounded-xl bg-secondary border border-border text-muted-foreground font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                  >
                    <LucideRotateCcw className="h-4 w-4" />
                    Re-record
                  </button>
                  <button
                    onClick={confirmAndSave}
                    disabled={isSaving}
                    className="flex-1 h-12 rounded-xl bg-primary text-black font-black text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                  >
                    {isSaving ? (
                      <LucideLoader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LucideCheck className="h-4 w-4" />
                    )}
                    {isSaving ? 'Saving...' : 'Confirm & Save'}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ── QR Scanner Modal ── */}
      {showQR && (
        <div className="fixed inset-0 z-[60] md:hidden bg-background backdrop-blur-xl flex flex-col">
          <div className="flex items-center justify-between p-4">
            <h2 className="text-lg font-black text-foreground tracking-tight">Scan QR Code</h2>
            <button
              onClick={() => setShowQR(false)}
              className="h-10 w-10 rounded-full bg-secondary/50 flex items-center justify-center"
            >
              <LucideX className="h-5 w-5 text-foreground" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-border aspect-square shadow-2xl">
              <QRCodeScanner
                onScan={handleScan}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onError={(err: any) => {
                  console.error('QR Error:', err)
                  if (err?.message?.includes('Permission denied')) {
                    toast.error('Camera permission denied.')
                  }
                }}
                formats={['qr_code']}
                styles={{ container: { width: '100%', height: '100%' } }}
              />
              <div className="pointer-events-none absolute inset-0 z-10 border-4 border-primary/20 rounded-2xl" />
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground font-medium pb-8">
            Point camera at a BrewBrain vessel QR code
          </p>
        </div>
      )}
    </>
  )
}
