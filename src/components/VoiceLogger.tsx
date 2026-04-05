'use client'

import { useState, useRef } from 'react'
import { LucideMic, LucideSquare, LucideLoader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { processVoiceLog } from '@/app/actions/voice'
import { enqueueAction } from '@/lib/offlineQueue'
import { useTierCheck } from '@/components/UpgradeGate'
import { LucideLock } from 'lucide-react'

interface VoiceLoggerProps {
  tankId?: string
  className?: string
  disabled?: boolean
  variant?: 'default' | 'sidebar'
}

export function VoiceLogger({ tankId, className, disabled, variant = 'default' }: VoiceLoggerProps) {
  const isPremium = useTierCheck('production')
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const isSidebar = variant === 'sidebar'

  const speakFeedback = (data: any) => {
    if ('speechSynthesis' in window) {
      let text = 'Log saved.'
      if (data) {
        const parts = []
        if (data.batch_id) {
          parts.push(`Batch ${data.batch_id.replace(/[^a-zA-Z0-9 ]/g, '')} updated.`)
        } else {
          parts.push('Batch updated.')
        }
        
        if (data.gravity) {
           // format 1.012 to "1 point zero 1 2" so TTS reads it perfectly
           const gravText = String(data.gravity).split('').map(c => {
             if (c === '.') return 'point'
             if (c === '0') return 'zero'
             return c
           }).join(' ')
           parts.push(`Gravity ${gravText}.`)
        }
        
        if (data.temperature) {
           parts.push(`Temperature ${data.temperature} degrees.`)
        }
        
        if (parts.length > 0) text = parts.join(' ')
      }
      
      const utterance = new SpeechSynthesisUtterance(text)
      window.speechSynthesis.speak(utterance)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = handleStop
      mediaRecorder.start(200)
      setIsRecording(true)
      
      toast.info('Neural Link Established: Recording...', { duration: 2000 })
    } catch (err: any) {
      console.error('Mic error:', err)
      toast.error('Voice Interface Error: Check Permissions')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
      setIsRecording(false)
    }
  }

  const handleStop = async () => {
    setIsProcessing(true)

    const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })

    if (!navigator.onLine) {
      await enqueueAction({
        type: 'voice-log',
        payload: audioBlob,
        tankId
      })
      toast.success('Offline Link Established. Data Queued.', { duration: 5000 })
      setIsProcessing(false)
      return
    }

    const toastId = toast.loading('BrewBrain AI extraction in progress...')
    
    try {
      const audioFile = new File([audioBlob], 'voice-log.webm', { type: 'audio/webm' })

      const formData = new FormData()
      formData.append('audio', audioFile)
      if (tankId) formData.append('tankId', tankId)

      const result = await processVoiceLog(formData)
      
      if (result && result.success) {
        toast.success(`Data Synchronized: Temp ${result.data.temperature || '??'} / Grav ${result.data.gravity || '??'}`, { id: toastId, duration: 5000 })
        speakFeedback(result.data)
      } else {
        toast.error(result?.error || 'Extraction Failed.', { id: toastId })
      }
    } catch (error) {
      toast.error('Network fluctuating. Falling back to offline queue.', { id: toastId })
      await enqueueAction({
        type: 'voice-log',
        payload: audioBlob,
        tankId
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className={cn(
      "flex flex-col items-center",
      isSidebar ? "w-full py-2" : className
    )}>
      <div className="relative group w-full flex justify-center">
        {/* Static Aura */}
        {(isRecording || isSidebar) && (
          <div className={cn(
            "absolute inset-0 -z-10 blur-lg transition-all duration-1000",
            (isRecording || (isSidebar && isPremium))
              ? "bg-primary/20 scale-125 opacity-100" 
              : "bg-primary/5 scale-100 opacity-0 group-hover:opacity-40",
            isSidebar ? "rounded-xl" : "rounded-full"
          )} />
        )}

        <Button
          type="button"
          disabled={isProcessing || disabled || (!isPremium && isSidebar)}
          onMouseDown={isPremium ? startRecording : undefined}
          onMouseUp={isPremium ? stopRecording : undefined}
          onTouchStart={isPremium ? startRecording : undefined}
          onTouchEnd={isPremium ? stopRecording : undefined}
          onMouseLeave={isPremium ? stopRecording : undefined}
          onClick={(!isPremium && isSidebar) ? () => toast.info('AI Voice Logging is a Production feature. Upgrade to unlock.') : undefined}
          className={cn(
            "transition-all duration-500 transform-gpu overflow-hidden relative",
            isSidebar 
              ? "w-full h-12 rounded-xl flex items-center justify-center gap-2.5 px-4 border shadow-[0_0_15px_rgba(245,158,11,0.15)]" 
              : "h-24 w-24 rounded-full border-2 shadow-2xl",
            isSidebar && (
              isPremium 
                ? "bg-gradient-to-br from-orange-500 to-orange-700 border-orange-500/30 text-foreground shadow-orange-500/25 hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] active:scale-[0.98]" 
                : "bg-secondary border-border text-muted-foreground grayscale opacity-60"
            ),
            !isSidebar && (
              isRecording 
                ? "bg-primary border-border shadow-[0_0_60px_rgba(245,158,11,0.4)] scale-110" 
                : "bg-card border-border"
            )
          )}
        >
          {isProcessing ? (
            <span className="flex items-center gap-2.5">
              <LucideLoader2 className={cn("h-4 w-4 animate-spin", isSidebar ? "text-foreground" : "text-primary")} />
              <span className={cn("text-xs font-black uppercase tracking-widest", isSidebar ? "text-foreground" : "text-black")}>Analysing</span>
            </span>
          ) : isRecording ? (
            <span className="flex items-center gap-2.5">
              <LucideSquare className={cn("h-4 w-4 fill-current", isSidebar ? "text-foreground" : "text-black")} />
              <span className={cn("text-xs font-black uppercase tracking-widest", isSidebar ? "text-foreground" : "text-black")}>Listening</span>
            </span>
          ) : (
            <span className="flex items-center gap-2.5 translate-y-[0.5px]">
              {isSidebar && !isPremium ? (
                <>
                  <LucideLock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[10px] font-bold text-muted-foreground tracking-tight">AI Voice Locked</span>
                </>
              ) : (
                <>
                  <LucideMic className={cn(
                    "transition-transform duration-300 group-hover:scale-110",
                    isSidebar ? "h-4 w-4 text-foreground" : "h-10 w-10 text-primary"
                  )} />
                  {isSidebar && (
                    <span className="text-xs font-black uppercase tracking-widest text-foreground">Record Log</span>
                  )}
                </>
              )}
            </span>
          )}
             
          {/* Progress Shimmer for processing */}
          {isProcessing && (
            <span className="absolute inset-0 bg-white/20 animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
          )}
        </Button>
      </div>

      {!isSidebar && (
        <div className="mt-8 text-center space-y-2">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground group-hover:text-foreground transition-colors">
            {isProcessing ? 'Analyzing' : isRecording ? 'Transmitting' : 'Voice Interface'}
          </p>
          <p className="text-lg font-bold text-foreground tracking-tight">
            {isProcessing ? 'Synthesizing Data...' : isRecording ? 'Listening to Environment' : 'Push to Authenticate Log'}
          </p>
          {!isRecording && !isProcessing && (
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest bg-secondary px-4 py-1 rounded-full border border-border mx-auto w-fit">
              "Gravity 1.012, Temp 68"
            </p>
          )}
        </div>
      )}
    </div>
  )
}
