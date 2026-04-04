'use client'

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

interface Reading {
  id: string
  gravity: number | null
  temperature: number | null
  created_at: string
}

export function GravityChart({ readings }: { readings: Reading[] }) {
  if (!readings || readings.length < 2) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm font-medium">
        Need at least 2 readings to show a chart.
      </div>
    )
  }

  const data = readings
    .filter(r => r.gravity != null || r.temperature != null)
    .map(r => ({
      date: new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      gravity: r.gravity,
      temp: r.temperature,
    }))
    .reverse()

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
