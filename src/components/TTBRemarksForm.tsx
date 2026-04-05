'use client'

import { useState } from 'react'
import { LucideCheck, LucideMessageSquarePlus, LucideLoader2 } from 'lucide-react'
import { updateShrinkageTTBRemarks } from '@/app/(app)/compliance/actions'

export function TTBRemarksForm({ alertId }: { alertId: string }) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [remarks, setRemarks] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!remarks.trim()) return

    setLoading(true)
    const res = await updateShrinkageTTBRemarks(alertId, remarks, true)
    
    if (res.success) {
      setSuccess(true)
      setIsEditing(false)
      // Visual feedback wait
      setTimeout(() => setSuccess(false), 2000)
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="w-full py-2 flex items-center justify-center gap-2 bg-emerald-500/10 text-emerald-400 text-xs font-black rounded border border-emerald-500/20">
        <LucideCheck className="w-3.5 h-3.5" /> REMARK ADDED
      </div>
    )
  }

  if (!isEditing) {
    return (
      <button 
        onClick={() => setIsEditing(true)}
        className="w-full py-1.5 text-xs font-bold bg-white text-black rounded hover:bg-white/90 transition-colors flex items-center justify-center gap-1.5"
      >
        <LucideMessageSquarePlus className="w-3.5 h-3.5" />
        Add TTB Remarks
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-2 animate-in fade-in slide-in-from-top-1">
      <textarea 
        autoFocus
        placeholder="Reason for loss reported on 5130.9..."
        className="w-full bg-black/50 border border-border rounded text-xs p-2 min-h-[60px] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground placeholder:text-muted-foreground/50"
        value={remarks}
        onChange={e => setRemarks(e.target.value)}
        required
      />
      <div className="flex gap-2">
        <button 
          type="button" 
          onClick={() => setIsEditing(false)}
          className="flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider bg-transparent border border-border text-muted-foreground rounded hover:bg-white/5 transition-colors"
        >
          Cancel
        </button>
        <button 
          type="submit" 
          disabled={loading || !remarks.trim()}
          className="flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white rounded hover:bg-rose-500/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
        >
          {loading ? <LucideLoader2 className="w-3 h-3 animate-spin"/> : 'Save Report'}
        </button>
      </div>
    </form>
  )
}
