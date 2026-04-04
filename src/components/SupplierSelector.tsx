'use client'

import { useState, useEffect } from 'react'
import { Supplier } from '@/types/database'
import { getSuppliers } from '@/app/actions/supplier-actions'
import { Button } from '@/components/ui/button'
import { LucideChevronDown, LucidePlus } from 'lucide-react'
import Link from 'next/link'

interface SupplierSelectorProps {
  breweryId: string
  supplierId?: string
  onSelect: (supplier: Supplier) => void
  label?: string
  placeholder?: string
}

export function SupplierSelector({
  breweryId,
  supplierId,
  onSelect,
  label = 'Supplier',
  placeholder = 'Select a supplier...'
}: SupplierSelectorProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)

  // Load suppliers on mount
  useEffect(() => {
    loadSuppliers()
  }, [breweryId])

  // Load selected supplier
  useEffect(() => {
    if (supplierId && suppliers.length > 0) {
      const selected = suppliers.find(s => s.id === supplierId)
      if (selected) {
        setSelectedSupplier(selected)
      }
    }
  }, [supplierId, suppliers])

  const loadSuppliers = async () => {
    try {
      setIsLoading(true)
      const result = await getSuppliers(breweryId)
      if (result.success) {
        // Filter to only active suppliers
        const activeSuppliers = result.data.filter(s => s.is_active)
        setSuppliers(activeSuppliers)
      }
    } catch (error) {
      console.error('Failed to load suppliers:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelect = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    onSelect(supplier)
    setIsOpen(false)
  }

  return (
    <div className="space-y-2">
      {label && <label className="block text-sm font-medium">{label}</label>}
      
      <div className="relative">
        {/* Selected Value Display */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-3 py-2 border rounded-md bg-white dark:bg-slate-900 dark:border-slate-700 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <span className={selectedSupplier ? 'text-foreground' : 'text-slate-500'}>
            {isLoading ? 'Loading...' : selectedSupplier?.name || placeholder}
          </span>
          <LucideChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 border rounded-md bg-white dark:bg-slate-900 dark:border-slate-700 shadow-lg z-10 max-h-64 overflow-y-auto">
            {suppliers.length === 0 ? (
              <div className="p-3 text-sm text-slate-600 dark:text-slate-400">
                <div className="mb-2">No suppliers yet.</div>
                <Link href="/suppliers/create">
                  <Button size="sm" className="w-full gap-2">
                    <LucidePlus className="w-3 h-3" />
                    Create Supplier
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                {suppliers.map((supplier) => (
                  <button
                    key={supplier.id}
                    type="button"
                    onClick={() => handleSelect(supplier)}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800 border-b last:border-b-0 dark:border-slate-700 ${
                      selectedSupplier?.id === supplier.id 
                        ? 'bg-blue-50 dark:bg-blue-900' 
                        : ''
                    }`}
                  >
                    <div className="font-medium">{supplier.name}</div>
                    {(supplier.specialty || supplier.city) && (
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        {supplier.specialty && supplier.city 
                          ? `${supplier.specialty} • ${supplier.city}`
                          : supplier.specialty || supplier.city}
                      </div>
                    )}
                  </button>
                ))}

                <div className="border-t dark:border-slate-700 p-2">
                  <Link href="/suppliers/create" className="block w-full">
                    <Button variant="outline" size="sm" className="w-full gap-2">
                      <LucidePlus className="w-3 h-3" />
                      Add New Supplier
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
