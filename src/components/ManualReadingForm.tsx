'use client'

import { useState } from 'react'
import { logManualReading } from '@/app/(app)/batches/[id]/actions'
import { enqueueAction } from '@/lib/offlineQueue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LucideFlaskConical, LucideChevronDown, LucideChevronUp, LucideLoaderCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ManualReadingFormProps {
  batchId: string
}

export function ManualReadingForm({ batchId }: ManualReadingFormProps) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [successMessage, setSuccessMessage] = useState('Reading logged')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setStatus('idle')
    setErrorMessage('')

    const form = e.currentTarget
    const formData = new FormData(form)
    const externalId = crypto.randomUUID()
    formData.set('external_id', externalId)

    try {
      if (!navigator.onLine) {
        await enqueueAction({
          type: 'manual-reading',
          externalId,
          payload: {
            batchId,
            temperature: (formData.get('temperature') as string | null) || undefined,
            gravity: (formData.get('gravity') as string | null) || undefined,
            ph: (formData.get('ph') as string | null) || undefined,
            dissolved_oxygen: (formData.get('dissolved_oxygen') as string | null) || undefined,
            pressure: (formData.get('pressure') as string | null) || undefined,
            notes: (formData.get('notes') as string | null) || undefined,
          },
        })

        setSuccessMessage('Reading queued for sync')
        setStatus('success')
        form.reset()
        setTimeout(() => setStatus('idle'), 3000)
        return
      }

      const result = await logManualReading(formData)

      if (result.success) {
        setSuccessMessage('Reading logged')
        setStatus('success')
        form.reset()
        setTimeout(() => setStatus('idle'), 3000)
        return
      }

      setStatus('error')
      setErrorMessage(result.error || 'Failed to log reading')
    } catch {
      try {
        await enqueueAction({
          type: 'manual-reading',
          externalId,
          payload: {
            batchId,
            temperature: (formData.get('temperature') as string | null) || undefined,
            gravity: (formData.get('gravity') as string | null) || undefined,
            ph: (formData.get('ph') as string | null) || undefined,
            dissolved_oxygen: (formData.get('dissolved_oxygen') as string | null) || undefined,
            pressure: (formData.get('pressure') as string | null) || undefined,
            notes: (formData.get('notes') as string | null) || undefined,
          },
        })

        setSuccessMessage('Connection dropped. Reading queued for sync')
        setStatus('success')
        form.reset()
        setTimeout(() => setStatus('idle'), 3000)
      } catch {
        setStatus('error')
        setErrorMessage('Failed to log reading')
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <Card className="glass border-border overflow-hidden">
      <CardHeader className="pb-0">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between py-4 text-left group"
        >
          <CardTitle className="text-lg font-black tracking-tight flex items-center gap-2">
            <LucideFlaskConical className="h-4 w-4 text-primary/60" />
            Log Manual Reading
          </CardTitle>
          <span className="text-muted-foreground group-hover:text-foreground transition-colors">
            {open ? <LucideChevronUp className="h-4 w-4" /> : <LucideChevronDown className="h-4 w-4" />}
          </span>
        </button>
      </CardHeader>

      {open && (
        <CardContent className="pt-2 pb-6">
          <p className="text-sm text-muted-foreground font-medium mb-6">
            Log temperature, gravity, pH, dissolved oxygen, and pressure. Leave any field blank to skip.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="hidden" name="batchId" value={batchId} />

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Temperature (°C)
                </Label>
                <Input
                  name="temperature"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="e.g. 18.5"
                  className="font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Gravity (SG)
                </Label>
                <Input
                  name="gravity"
                  type="number"
                  step="0.001"
                  min="0.990"
                  max="1.200"
                  placeholder="e.g. 1.045"
                  className="font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  pH
                </Label>
                <Input
                  name="ph"
                  type="number"
                  step="0.01"
                  min="0"
                  max="14"
                  placeholder="e.g. 4.6"
                  className={cn('font-mono')}
                />
                <p className="text-[10px] text-muted-foreground font-mono">Target: 4.0 – 5.5</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Dissolved O₂ (ppm)
                </Label>
                <Input
                  name="dissolved_oxygen"
                  type="number"
                  step="0.01"
                  min="0"
                  max="20"
                  placeholder="e.g. 0.08"
                  className="font-mono"
                />
                <p className="text-[10px] text-muted-foreground font-mono">Target: &lt; 0.1 ppm</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Pressure (PSI)
                </Label>
                <Input
                  name="pressure"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="e.g. 8.0"
                  className="font-mono"
                />
                <p className="text-[10px] text-muted-foreground font-mono">Threshold: &gt; 15 PSI</p>
              </div>

              <div className="space-y-1.5 col-span-2 md:col-span-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Notes
                </Label>
                <Input
                  name="notes"
                  type="text"
                  placeholder="Optional notes…"
                  className="font-mono"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={pending} className="font-bold">
                {pending ? (
                  <>
                    <LucideLoaderCircle className="h-4 w-4 mr-2 animate-spin" />
                    Logging…
                  </>
                ) : (
                  'Log Reading'
                )}
              </Button>

              {status === 'success' && (
                <span className="text-xs font-bold text-green-400 animate-in fade-in">
                  ✓ {successMessage}
                </span>
              )}
              {status === 'error' && (
                <span className="text-xs font-bold text-red-400">{errorMessage}</span>
              )}
            </div>
          </form>
        </CardContent>
      )}
    </Card>
  )
}
