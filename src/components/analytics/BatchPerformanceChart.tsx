'use client'

import { useHasMounted } from '@/lib/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts'
import { useTheme } from 'next-themes'

interface BatchPerformanceData {
  batchId: string
  name: string
  targetOG: number | null
  actualOG: number | null
  efficiency: number
  boilOff: number | null
  status: string
}

interface TooltipPayloadEntry {
  value: number | null
  payload: BatchPerformanceData
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadEntry[]; label?: string }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover text-popover-foreground border border-border p-3 rounded-lg shadow-xl text-xs space-y-1">
        <p className="font-bold mb-2">{label}</p>
        <p className="text-primary font-bold">
          Actual OG: {payload[0]?.value ? payload[0].value.toFixed(3) : 'N/A'}
        </p>
        <p className="text-muted-foreground font-bold">
          Target OG: {payload[1]?.value ? payload[1].value.toFixed(3) : 'N/A'}
        </p>
        <p className="text-foreground mt-2 border-t border-border pt-1">
          Efficiency: {payload[0].payload.efficiency}%
        </p>
      </div>
    )
  }
  return null
}

export function BatchPerformanceChart({ data }: { data: BatchPerformanceData[] }) {
  const { resolvedTheme } = useTheme()
  const mounted = useHasMounted()
  const isDark = resolvedTheme === 'dark'

  const colors = {
    grid: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    text: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
    actual: 'hsl(var(--primary))',
    target: isDark ? '#4b5563' : '#9ca3af' // gray-600 / gray-400
  }

  if (!data || data.length === 0) {
    return (
      <Card className="flex h-full min-w-0 flex-col bg-surface" data-testid="batch-performance-card">
        <CardHeader>
          <CardTitle>Mash Efficiency Variance</CardTitle>
          <CardDescription>Target vs Actual Original Gravity across recent batches</CardDescription>
        </CardHeader>
        <CardContent
          className="flex flex-1 min-h-0 min-w-0 items-center justify-center"
          data-testid="batch-performance-card-content"
        >
          <div className="flex h-full min-h-[300px] w-full items-center justify-center text-muted-foreground font-medium">
            No batch performance data available
          </div>
        </CardContent>
      </Card>
    )
  }

  // Y-axis formatting constraint (we don't want 0-1.1, we want domain like [1.000, 1.150])
  const minOG = Math.min(
    ...data.map(d => d.actualOG || 1.100), 
    ...data.map(d => d.targetOG || 1.100)
  ) - 0.010
  
  const maxOG = Math.max(
    ...data.map(d => d.actualOG || 1.000), 
    ...data.map(d => d.targetOG || 1.000)
  ) + 0.010

  return (
    <Card className="flex h-full min-w-0 flex-col bg-surface" data-testid="batch-performance-card">
      <CardHeader>
        <CardTitle>Mash Efficiency Variance</CardTitle>
        <CardDescription>Target vs Actual Original Gravity across recent batches</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 min-h-0 min-w-0" data-testid="batch-performance-card-content">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%" minHeight={300}>
            <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: colors.text, fontSize: 10, fontWeight: 700 }}
                dy={10}
                tickFormatter={(val) => val.length > 12 ? val.substring(0, 12) + '...' : val}
              />
              <YAxis 
                domain={[Math.max(1.000, minOG), maxOG]}
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: colors.text, fontSize: 10, fontWeight: 700 }}
                tickFormatter={(val) => val.toFixed(3)}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: isDark ? '#ffffff05' : '#00000005' }} />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
              <Bar 
                dataKey="actualOG" 
                name="Actual OG" 
                fill={colors.actual} 
                radius={[4, 4, 0, 0]} 
                barSize={20}
              />
              <Bar 
                dataKey="targetOG" 
                name="Target OG" 
                fill={colors.target} 
                radius={[4, 4, 0, 0]} 
                barSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div
            className="flex h-full min-h-[300px] w-full items-center justify-center"
            data-testid="batch-performance-chart-fallback"
          />
        )}
      </CardContent>
    </Card>
  )
}
