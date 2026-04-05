'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend
} from 'recharts'
import { useTheme } from 'next-themes'

interface TrendData {
  date: string
  usage: number
  waste: number
  additions: number
}

export function InventoryTrendChart({ data }: { data: TrendData[] }) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const colors = {
    grid: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    text: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
    usage: 'hsl(var(--primary))',
    waste: 'rgb(2ef44, 63, 94)', // Rose 500
    wasteColor: isDark ? 'hsla(348, 83%, 47%, 0.5)' : '#f43f5e'
  }

  if (!data || data.length === 0) {
    return (
      <Card className="h-[400px] flex items-center justify-center">
        <p className="text-muted-foreground font-medium">No inventory trend data available</p>
      </Card>
    )
  }

  return (
    <Card className="flex flex-col h-full bg-surface">
      <CardHeader>
        <CardTitle>Inventory Flux</CardTitle>
        <CardDescription>Ingredient usage vs. shrinkage over time</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors.usage} stopOpacity={0.3} />
                <stop offset="95%" stopColor={colors.usage} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorWaste" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors.wasteColor} stopOpacity={0.4} />
                <stop offset="95%" stopColor={colors.wasteColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: colors.text, fontSize: 12, fontWeight: 700 }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: colors.text, fontSize: 12, fontWeight: 700 }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: isDark ? '#1a1a1a' : '#fff',
                borderColor: isDark ? '#333' : '#eee',
                borderRadius: '8px',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
              }}
            />
            <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
            <Area 
              type="monotone" 
              dataKey="usage" 
              name="Production Usage"
              stroke={colors.usage} 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorUsage)" 
            />
            <Area 
              type="monotone" 
              dataKey="waste" 
              name="Shrinkage/Waste"
              stroke={colors.wasteColor} 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorWaste)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
