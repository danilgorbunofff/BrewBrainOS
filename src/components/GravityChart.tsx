'use client'

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

interface Reading {
  id: string
  gravity: number | null
  temperature: number | null
  created_at: string
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
      date: new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit' }),
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
          dataKey="date"
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
        <Tooltip
          contentStyle={{
            background: '#0c0c0c',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 700,
            color: '#d4d4d8',
          }}
        />
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
