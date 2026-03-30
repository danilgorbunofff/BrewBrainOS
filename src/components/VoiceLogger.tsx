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
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      })
      
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = handleStop
      mediaRecorder.start(200) // Collect chunks every 200ms
      setIsRecording(true)
      
      toast.info('Recording...', { duration: 2000 })
    } catch (err: any) {
      console.error('Error accessing microphone:', err)
      if (err.name === 'NotAllowedError') {
        toast.error('Microphone access denied. Please allow it in your browser settings.')
      } else {
        toast.error('Failed to access microphone. Are you on a secure (HTTPS) connection?')
      }
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      // Stop all audio tracks
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
      setIsRecording(false)
    }
  }

  const handleStop = async () => {
    setIsProcessing(true)
    const toastId = toast.loading('BrewBrain AI processing your log...')

    try {
      const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
      const audioFile = new File([audioBlob], 'voice-log.webm', { type: 'audio/webm' })

      const formData = new FormData()
      formData.append('audio', audioFile)
      if (tankId) {
        formData.append('tankId', tankId)
      }

      const result = await processVoiceLog(formData)
      
      if (result && result.success) {
        toast.success(`Log processed successfully! Temp: ${result.data.temperature || 'N/A'}, Gravity: ${result.data.gravity || 'N/A'}`, { id: toastId, duration: 5000 })
      } else {
        toast.error(result?.error || 'Failed to process voice log.', { id: toastId })
      }
    } catch (error) {
      console.error('Voice processing error:', error)
      toast.error('Network or server error occurred.', { id: toastId })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className={`flex flex-col items-center ${className || ''}`}>
      <Button
        type="button"
        size="lg"
        variant={isRecording ? 'destructive' : 'default'}
        disabled={isProcessing}
        onMouseDown={startRecording}
        onMouseUp={stopRecording}
        onTouchStart={startRecording}
        onTouchEnd={stopRecording}
        onMouseLeave={stopRecording}
        className={`h-24 w-24 rounded-full shadow-2xl transition-all duration-300 ${
          isRecording ? 'bg-red-600 hover:bg-red-700 animate-pulse scale-110 shadow-[0_0_40px_rgba(220,38,38,0.5)]' : 'bg-orange-600 hover:bg-orange-700 hover:scale-105 shadow-[0_0_30px_rgba(234,88,12,0.3)]'
        }`}
      >
        {isProcessing ? (
          <LucideLoader2 className="h-10 w-10 animate-spin text-white" />
        ) : isRecording ? (
          <LucideSquare className="h-10 w-10 text-white fill-white" />
        ) : (
          <LucideMic className="h-10 w-10 text-white" />
        )}
      </Button>
      <div className="mt-4 text-center">
        <p className="text-sm font-semibold text-zinc-300">
          {isProcessing ? 'Analyzing audio...' : isRecording ? 'Release to Send' : 'Hold to Log Reading'}
        </p>
        {!isRecording && !isProcessing && (
           <p className="text-xs text-zinc-500 mt-1 max-w-[200px]">
             Say something like: "Temperature is 68, gravity is 1.012."
           </p>
        )}
      </div>
    </div>
  )
}
