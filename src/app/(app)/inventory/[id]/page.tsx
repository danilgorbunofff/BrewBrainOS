'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DegradationCard } from '@/components/DegradationCard'
import { DegradationDetailsModal } from '@/components/DegradationDetailsModal'
import {
  LucideArrowLeft, LucideAlertTriangle, LucideBoxes, LucideCalendar,
  LucideTag, LucideFactory, LucideThermometer, LucideTrash2,
  LucideBarcode, LucideWeight
} from 'lucide-react'
import { getDegradationHealthStatus } from '@/lib/degradation'
import { deleteInventoryItem } from '@/app/(app)/inventory/actions'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'
import { InventoryItem } from '@/types/database'
import { cn } from '@/lib/utils'

export default function InventoryItemPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const supabase = createClient()

  const [item, setItem] = useState<InventoryItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)

  useEffect(() => {
    const fetchItem = async () => {
      try {
        setLoading(true)
        const { data, error: fetchError } = await supabase
          .from('inventory')
          .select('*')
          .eq('id', id)
          .single()

        if (fetchError) {
          setError('Inventory item not found')
          return
        }

        if (data) {
          setItem(data as InventoryItem)
        }
      } catch (err) {
        setError('Failed to load inventory item')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchItem()
  }, [id, supabase])

  const handleItemUpdate = (updatedItem: InventoryItem) => {
    setItem(updatedItem)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground p-4 md:p-8 flex items-center justify-center">
        <div className="text-muted-foreground">Loading inventory item...</div>
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md glass border-border p-8 text-center text-foreground">
          <LucideAlertTriangle className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Item Not Found</h2>
          <p className="text-muted-foreground mb-6">{error || 'The inventory item could not be found.'}</p>
          <Link href="/inventory">
            <Button>Back to Inventory</Button>
          </Link>
        </Card>
      </div>
    )
  }

  const ppgLoss = item.ppg_initial && item.ppg_current
    ? ((item.ppg_initial - item.ppg_current) / item.ppg_initial) * 100
    : 0

  const healthStatus = getDegradationHealthStatus(
    item.hsi_current,
    item.grain_moisture_current,
    ppgLoss
  )

  const getHealthColorClass = (status: string) => {
    switch (status) {
      case 'critical':
        return 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-700 text-red-900 dark:text-red-100'
      case 'degraded':
        return 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-700 text-yellow-900 dark:text-yellow-100'
      case 'fresh':
        return 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-700 text-green-900 dark:text-green-100'
      default:
        return 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100'
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8 pt-6 md:pt-8 pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/inventory">
            <Button variant="ghost" size="icon" className="rounded-full">
              <LucideArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter">{item.name}</h1>
            <p className="text-muted-foreground mt-1">
              {item.item_type} • Stock: {item.current_stock} {item.unit}
            </p>
          </div>
          <DeleteConfirmDialog
            action={deleteInventoryItem}
            hiddenInputs={{ itemId: id }}
            itemName={item.name}
            trigger={
              <Button variant="destructive" size="icon">
                <LucideTrash2 className="h-5 w-5" />
              </Button>
            }
            onSuccess={() => router.push('/inventory')}
          />
        </div>

        {/* Key Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Stock Status */}
          <Card className="glass border-border">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <LucideWeight className="h-5 w-5" />
                Current Stock
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-black">{item.current_stock}</p>
              <p className="text-sm text-muted-foreground mt-1">{item.unit}</p>
              {item.reorder_point && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">Reorder Point</p>
                  <p className="text-lg font-bold">{item.reorder_point} {item.unit}</p>
                  {item.current_stock <= item.reorder_point && (
                    <Badge variant="destructive" className="mt-2">Low Stock</Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Health Status */}
          <Card className={cn('glass border-2', getHealthColorClass(healthStatus))}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Ingredient Quality</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-black capitalize">{healthStatus}</p>
              <p className="text-sm mt-1">
                {healthStatus === 'fresh' && '✓ Optimal quality - use as needed'}
                {healthStatus === 'degraded' && '⚠ Quality declining - prioritize usage'}
                {healthStatus === 'critical' && '🚨 Severely degraded - replace or test'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Lot & Supplier Info */}
        <Card className="glass border-border">
          <CardHeader>
            <CardTitle>Lot & Supplier Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {item.lot_number && (
              <div className="flex gap-3">
                <LucideBarcode className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Lot Number</p>
                  <p className="text-lg font-mono font-bold">{item.lot_number}</p>
                </div>
              </div>
            )}
            {item.manufacturer && (
              <div className="flex gap-3">
                <LucideFactory className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Manufacturer</p>
                  <p className="text-lg font-bold">{item.manufacturer}</p>
                </div>
              </div>
            )}
            {item.expiration_date && (
              <div className="flex gap-3">
                <LucideCalendar className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Expiration Date</p>
                  <p className="text-lg font-bold">{new Date(item.expiration_date).toLocaleDateString()}</p>
                </div>
              </div>
            )}
            {item.received_date && (
              <div className="flex gap-3">
                <LucideCalendar className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Received Date</p>
                  <p className="text-lg font-bold">{new Date(item.received_date).toLocaleDateString()}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Degradation Metrics Card */}
        {(item.item_type === 'Hops' || item.item_type === 'Grain') && (
          <>
            <DegradationCard item={item} onUpdate={handleItemUpdate} />

            {/* View Full Details Button */}
            <div className="flex justify-center">
              <Button
                onClick={() => setDetailsModalOpen(true)}
                variant="outline"
                className="border-primary/50 hover:border-primary"
              >
                View Full Degradation History
              </Button>
            </div>
          </>
        )}

        {/* No Tracking Info */}
        {item.item_type !== 'Hops' && item.item_type !== 'Grain' && (
          <Card className="glass border-border bg-foreground/5">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <LucideBoxes className="h-5 w-5" />
                Degradation Tracking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Degradation tracking is only available for Hops and Grain items. 
                {item.item_type === 'Yeast' && ' Yeast quality should be monitored by temperature and storage conditions.'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Degradation Details Modal */}
      {item && (item.item_type === 'Hops' || item.item_type === 'Grain') && (
        <DegradationDetailsModal
          item={item}
          open={detailsModalOpen}
          onOpenChange={setDetailsModalOpen}
          onUpdate={handleItemUpdate}
        />
      )}
    </div>
  )
}
