'use client'

import { InventoryItem } from '@/types/database'
import { Button } from '@/components/ui/button'
import { LucideMail, LucidePhone, LucideExternalLink } from 'lucide-react'
import Link from 'next/link'

interface InventorySupplierInfoProps {
  inventoryItem: InventoryItem & {
    supplier_id?: string | null
    supplier_name?: string | null
    supplier_contact?: string | null
    purchase_price?: number | null
  }
}

export function InventorySupplierInfo({ inventoryItem }: InventorySupplierInfoProps) {
  if (!inventoryItem.supplier_name && !inventoryItem.supplier_id) {
    return (
      <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-900">
        <h3 className="font-bold text-base mb-2">Supplier Information</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          No supplier assigned. 
          {inventoryItem.supplier_id && (
            <Link 
              href={`/suppliers/${inventoryItem.supplier_id}`}
              className="text-blue-600 dark:text-blue-400 hover:underline ml-1"
            >
              View supplier →
            </Link>
          )}
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-900 space-y-3">
      <h3 className="font-bold text-base">Supplier Information</h3>

      {/* Supplier Name */}
      {inventoryItem.supplier_name && (
        <div>
          <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Supplier</div>
          <div className="font-medium">
            {inventoryItem.supplier_id ? (
              <Link 
                href={`/suppliers/${inventoryItem.supplier_id}`}
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {inventoryItem.supplier_name}
              </Link>
            ) : (
              inventoryItem.supplier_name
            )}
          </div>
        </div>
      )}

      {/* Supplier Contact */}
      {inventoryItem.supplier_contact && (
        <div>
          <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Contact</div>
          <div className="font-medium">{inventoryItem.supplier_contact}</div>
        </div>
      )}

      {/* Purchase Price */}
      {inventoryItem.purchase_price && (
        <div>
          <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Unit Price</div>
          <div className="font-medium">
            ${inventoryItem.purchase_price.toFixed(2)} / {inventoryItem.unit}
          </div>
        </div>
      )}

      {/* Actions */}
      {inventoryItem.supplier_id && (
        <div className="pt-2">
          <Link href={`/suppliers/${inventoryItem.supplier_id}`}>
            <Button variant="outline" size="sm" className="gap-2">
              <LucideExternalLink className="w-3 h-3" />
              View Supplier Profile
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
