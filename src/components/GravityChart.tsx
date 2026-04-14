'use client'

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { formatShortDate } from '@/lib/date-format'

interface Reading {
  id: string
  gravity: number | null
  temperature: number | null
  created_at: string
}

interface TooltipPayloadEntry {
  dataKey: string
  value: number | null
  color: string
  payload?: { timestamp?: number; date?: string }
}

export function FermentationTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string | number
}) {
  if (!active || !payload?.length) return null

  const gravityEntry = payload.find(p => p.dataKey === 'gravity')
  const tempEntry = payload.find(p => p.dataKey === 'temp')

  if (gravityEntry?.value == null && tempEntry?.value == null) return null

  // Prefer timestamp stored on the payload data point (works with index-keyed axis);
  // fall back to string label for direct tooltip renders (e.g. tests).
  const ts = payload?.[0]?.payload?.timestamp
  const displayLabel = ts
    ? new Date(ts).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : typeof label === 'string' ? label : undefined

  return (
    <div
      style={{
        background: '#0c0c0c',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '10px 14px',
        fontSize: '12px',
        fontWeight: 700,
        color: '#d4d4d8',
      }}
    >
      {displayLabel && (
        <p style={{ marginBottom: 6, color: '#71717a', fontSize: 11 }}>{displayLabel}</p>
      )}
      {gravityEntry?.value != null && (
        <p style={{ color: '#f59e0b' }}>Gravity : {Number(gravityEntry.value).toFixed(3)}</p>
      )}
      {tempEntry?.value != null && (
        <p style={{ color: '#3b82f6' }}>Temp (°F) : {Number(tempEntry.value).toFixed(1)}</p>
      )}
    </div>
  )
}

export function GravityChart({ 
  readings,
  targetProfile 
}: { 
  readings: Reading[],
  targetProfile?: { og: number; fg: number; expectedDays?: number } 
}) {
  if (!readings || readings.length < 2) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm font-medium">
        Need at least 2 readings to show a chart.
      </div>
    )
  }

  const rawData = [...readings]
    .filter(r => r.gravity != null || r.temperature != null)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  const startTime = new Date(rawData[0].created_at).getTime()
  
  const expectedDays = targetProfile?.expectedDays || 14
  const expectedEndTime = startTime + (expectedDays * 24 * 60 * 60 * 1000)

  const data = rawData.map(r => {
    const t = new Date(r.created_at).getTime()
    
    // For expected gravity, simple linear interpolation MVP (or decay)
    let expected_gravity = null
    if (targetProfile && targetProfile.og && targetProfile.fg) {
       const progress = Math.min(1, Math.max(0, (t - startTime) / (expectedEndTime - startTime)))
       // Slight exponential decay approximation: progress ^ 1.5 
       expected_gravity = targetProfile.og - (targetProfile.og - targetProfile.fg) * Math.pow(progress, 1.2)
    }

    return {
      index: rawData.indexOf(r),
      timestamp: t,
      date: formatShortDate(r.created_at),
      gravity: r.gravity,
      temp: r.temperature,
      expected: expected_gravity ? Number(expected_gravity.toFixed(3)) : null
    }
  })

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis
          dataKey="index"
          tickFormatter={(i: number) => data[i]?.date ?? ''}
          tick={{ fill: '#52525b', fontSize: 10, fontWeight: 700 }}
          axisLine={{ stroke: 'rgba(255,255,255,0.05)' }}
          tickLine={false}
        />
        <YAxis
          yAxisId="gravity"
          tick={{ fill: '#52525b', fontSize: 10, fontWeight: 700 }}
          axisLine={false}
          tickLine={false}
          domain={['auto', 'auto']}
        />
        <YAxis
          yAxisId="temp"
          orientation="right"
          tick={{ fill: '#52525b', fontSize: 10, fontWeight: 700 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<FermentationTooltip />} />
        <Line
          yAxisId="gravity"
          type="monotone"
          dataKey="gravity"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={{ fill: '#f59e0b', r: 3, strokeWidth: 0 }}
          activeDot={{ r: 5, fill: '#f59e0b', stroke: 'rgba(245,158,11,0.3)', strokeWidth: 4 }}
          name="Gravity"
        />
        {targetProfile && (
           <Line
             yAxisId="gravity"
             type="monotone"
             dataKey="expected"
             stroke="rgba(245,158,11,0.4)"
             strokeWidth={2}
             strokeDasharray="5 5"
             dot={false}
             name="Expected Profile"
             isAnimationActive={false}
           />
        )}
        <Line
          yAxisId="temp"
          type="monotone"
          dataKey="temp"
          stroke="#3b82f6"
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={{ fill: '#3b82f6', r: 3, strokeWidth: 0 }}
          name="Temp (°F)"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
