'use client'

import { useState, useRef } from 'react'
import { LucideMic, LucideSquare, LucideLoader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { processVoiceLog } from '@/app/actions/voice'

interface VoiceLoggerProps {
  tankId?: string
  className?: string
}

export function VoiceLogger({ tankId, className }: VoiceLoggerProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

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
    const toastId = toast.loading('BrewBrain AI extraction in progress...')

    try {
      const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
      const audioFile = new File([audioBlob], 'voice-log.webm', { type: 'audio/webm' })

      const formData = new FormData()
      formData.append('audio', audioFile)
      if (tankId) formData.append('tankId', tankId)

      const result = await processVoiceLog(formData)
      
      if (result && result.success) {
        toast.success(`Data Synchronized: Temp ${result.data.temperature || '??'} / Grav ${result.data.gravity || '??'}`, { id: toastId, duration: 5000 })
      } else {
        toast.error(result?.error || 'Extraction Failed.', { id: toastId })
      }
    } catch (error) {
      toast.error('System Link Failure.', { id: toastId })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className={`flex flex-col items-center ${className || ''}`}>
      <div className="relative group">
        {/* Animated Aura */}
        {isRecording && (
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping -z-10 scale-150 blur-xl transition-all" />
        )}
        <div className={`absolute inset-0 rounded-full bg-primary/10 -z-10 blur-2xl group-hover:bg-primary/20 transition-all duration-700 ${isRecording ? 'opacity-100 scale-125' : 'opacity-0 scale-100'}`} />

        <Button
          type="button"
          disabled={isProcessing}
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onTouchStart={startRecording}
          onTouchEnd={stopRecording}
          onMouseLeave={stopRecording}
          className={`h-24 w-24 rounded-full transition-all duration-500 transform-gpu ${
            isRecording 
              ? 'bg-primary hover:bg-primary shadow-[0_0_60px_rgba(245,158,11,0.6)] scale-110 !border-white/20' 
              : 'bg-zinc-900 hover:bg-zinc-800 shadow-2xl scale-100 border-white/5'
          } border-2 overflow-hidden`}
        >
          <div className="relative flex items-center justify-center h-full w-full">
             {isProcessing ? (
               <LucideLoader2 className="h-10 w-10 animate-spin text-primary" />
             ) : isRecording ? (
               <div className="flex flex-col items-center gap-1">
                 <LucideSquare className="h-8 w-8 text-white fill-white animate-pulse" />
                 <span className="text-[8px] font-black uppercase tracking-tighter text-white/50">Stop</span>
               </div>
             ) : (
               <LucideMic className="h-10 w-10 text-primary group-hover:scale-110 transition-transform duration-300" />
             )}
             
             {/* Progress Pulse for processing */}
             {isProcessing && (
               <div className="absolute inset-0 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
             )}
          </div>
        </Button>
      </div>

      <div className="mt-8 text-center space-y-2">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500 group-hover:text-zinc-300 transition-colors">
          {isProcessing ? 'Analyzing' : isRecording ? 'Transmitting' : 'Voice Interface'}
        </p>
        <p className="text-lg font-bold text-white tracking-tight">
          {isProcessing ? 'Synthesizing Data...' : isRecording ? 'Listening to Environment' : 'Push to Authenticate Log'}
        </p>
        {!isRecording && !isProcessing && (
           <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest bg-white/5 px-4 py-1 rounded-full border border-white/5 mx-auto w-fit">
             "Gravity 1.012, Temp 68"
           </p>
        )}
      </div>
    </div>
  )
}
