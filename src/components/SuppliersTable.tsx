'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { Supplier } from '@/types/database'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { getSuppliers, deleteSupplier } from '@/app/actions/supplier-actions'
import { Input } from '@/components/ui/input'
import { DeleteConfirmButton } from '@/components/DeleteConfirmButton'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { LucidePlus, LucideEdit, LucideTrash2, LucideExternalLink, LucideGlobe, LucidePhone, LucideMail, LucideMap, LucideSearch } from 'lucide-react'
import { toast } from 'sonner'

interface SuppliersTableProps {
  breweryId: string
  suppliers: Supplier[]
  onSupplierAdded?: () => void
  onSupplierUpdated?: () => void
}

export function SuppliersTable({ 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  breweryId, 
  suppliers: initialSuppliers,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onSupplierAdded,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onSupplierUpdated
}: SuppliersTableProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'All' | 'Distributor' | 'Direct' | 'Cooperative'>('All')
  const [filterActive, setFilterActive] = useState<'All' | 'Active' | 'Inactive'>('All')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isLoading, setIsLoading] = useState(false)

  // Filter suppliers based on search and filters
  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = 
      supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.contact_person?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.phone?.includes(searchQuery) ||
      supplier.city?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesType = filterType === 'All' || supplier.supplier_type === filterType
    const matchesActive = 
      filterActive === 'All' || 
      (filterActive === 'Active' && supplier.is_active) ||
      (filterActive === 'Inactive' && !supplier.is_active)
    
    return matchesSearch && matchesType && matchesActive
  })

  // Handle delete supplier
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDelete = useCallback(async (supplierId: string) => {
    try {
      setIsLoading(true)
      const result = await deleteSupplier(supplierId)
      
      if (!result.success) {
        toast.error(result.error)
        return
      }
      
      // Remove from local state
      setSuppliers(prev => prev.filter(s => s.id !== supplierId))
      toast.success('Supplier deleted successfully')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toast.error('Failed to delete supplier')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Empty state
  if (suppliers.length === 0) {
    return (
      <div className="py-16 text-center border rounded-lg bg-slate-50 dark:bg-slate-900">
        <div className="max-w-xs mx-auto space-y-4">
          <p className="text-slate-600 dark:text-slate-400">
            No suppliers yet. Create your first supplier to get started.
          </p>
          <Link href={`/suppliers/create`}>
            <Button>
              <LucidePlus className="w-4 h-4 mr-2" />
              Add Supplier
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // Render rating stars
  const renderStars = (rating: number) => {
    if (rating === 0) return <span className="text-slate-400 text-sm">No ratings</span>
    
    return (
      <div className="flex items-center gap-1">
        <div className="flex gap-px">
          {[...Array(5)].map((_, i) => (
            <span
              key={i}
              className={`text-lg ${
                i < Math.round(rating) 
                  ? 'text-amber-400' 
                  : 'text-slate-300'
              }`}
            >
              ★
            </span>
          ))}
        </div>
        <span className="text-sm text-slate-600 dark:text-slate-400">
          {rating.toFixed(1)}
        </span>
      </div>
    )
  }

  // Supplier type color
  const getSupplierTypeColor = (type: string) => {
    switch (type) {
      case 'Distributor':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
      case 'Direct':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
      case 'Cooperative':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100'
      default:
        return 'bg-slate-100 text-slate-800'
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex-1">
          <div className="relative">
            <LucideSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, contact, email, phone, or city..."
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          {/* Type filter */}
          <select
            value={filterType}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-3 py-2 border rounded-md bg-white dark:bg-slate-900 dark:border-slate-700"
          >
            <option>All</option>
            <option>Distributor</option>
            <option>Direct</option>
            <option>Cooperative</option>
          </select>

          {/* Active filter */}
          <select
            value={filterActive}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onChange={(e) => setFilterActive(e.target.value as any)}
            className="px-3 py-2 border rounded-md bg-white dark:bg-slate-900 dark:border-slate-700"
          >
            <option>All</option>
            <option>Active</option>
            <option>Inactive</option>
          </select>

          {/* Add button */}
          <Link href={`/suppliers/create`}>
            <Button>
              <LucidePlus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </Link>
        </div>
      </div>

      {/* Results counter */}
      <div className="text-sm text-slate-600 dark:text-slate-400">
        Showing {filteredSuppliers.length} of {suppliers.length} suppliers
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-900">
                <TableHead className="font-bold">Supplier</TableHead>
                <TableHead className="font-bold">Type</TableHead>
                <TableHead className="font-bold">Contact</TableHead>
                <TableHead className="font-bold">Location</TableHead>
                <TableHead className="font-bold">Rating</TableHead>
                <TableHead className="font-bold">Orders</TableHead>
                <TableHead className="font-bold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSuppliers.map((supplier) => (
                <TableRow 
                  key={supplier.id}
                  className={!supplier.is_active ? 'opacity-60' : ''}
                >
                  {/* Name & Specialty */}
                  <TableCell className="font-medium">
                    <Link 
                      href={`/suppliers/${supplier.id}`}
                      className="hover:underline text-blue-600 dark:text-blue-400"
                    >
                      {supplier.name}
                    </Link>
                    {supplier.specialty && (
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        {supplier.specialty}
                      </div>
                    )}
                    {!supplier.is_active && (
                      <Badge variant="secondary" className="mt-1">Inactive</Badge>
                    )}
                  </TableCell>

                  {/* Type */}
                  <TableCell>
                    <Badge className={getSupplierTypeColor(supplier.supplier_type)}>
                      {supplier.supplier_type}
                    </Badge>
                  </TableCell>

                  {/* Contact */}
                  <TableCell>
                    <div className="space-y-1 text-sm">
                      {supplier.contact_person && (
                        <div className="text-slate-700 dark:text-slate-300">
                          {supplier.contact_person}
                        </div>
                      )}
                      {supplier.email && (
                        <a 
                          href={`mailto:${supplier.email}`}
                          className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                        >
                          <LucideMail className="w-3 h-3" />
                          {supplier.email}
                        </a>
                      )}
                      {supplier.phone && (
                        <a 
                          href={`tel:${supplier.phone}`}
                          className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                        >
                          <LucidePhone className="w-3 h-3" />
                          {supplier.phone}
                        </a>
                      )}
                    </div>
                  </TableCell>

                  {/* Location */}
                  <TableCell>
                    {(supplier.city || supplier.state) && (
                      <div className="text-sm flex items-start gap-1">
                        <LucideMap className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <div>
                          {supplier.city && supplier.state 
                            ? `${supplier.city}, ${supplier.state}`
                            : supplier.city || supplier.state}
                        </div>
                      </div>
                    )}
                  </TableCell>

                  {/* Rating */}
                  <TableCell>
                    {renderStars(supplier.avg_quality_rating)}
                  </TableCell>

                  {/* Orders */}
                  <TableCell className="text-center">
                    <div className="font-medium">{supplier.total_orders}</div>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {supplier.website && (
                        <a 
                          href={supplier.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Visit website"
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                        >
                          <LucideGlobe className="w-4 h-4" />
                        </a>
                      )}
                      
                      <Link 
                        href={`/suppliers/${supplier.id}`}
                        title="View details"
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                      >
                        <LucideExternalLink className="w-4 h-4" />
                      </Link>

                      <Link 
                        href={`/suppliers/${supplier.id}/edit`}
                        title="Edit supplier"
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                      >
                        <LucideEdit className="w-4 h-4" />
                      </Link>

                      <DeleteConfirmButton
                        action={async () => {
                          const res = await deleteSupplier(supplier.id)
                          if (res.success) {
                            setSuppliers(prev => prev.filter(s => s.id !== supplier.id))
                          }
                          return res
                        }}
                        hiddenInputs={{}}
                        itemName={supplier.name}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* No results */}
      {filteredSuppliers.length === 0 && suppliers.length > 0 && (
        <div className="py-8 text-center border rounded-lg bg-slate-50 dark:bg-slate-900">
          <p className="text-slate-600 dark:text-slate-400">
            No suppliers match your search or filters.
          </p>
        </div>
      )}
    </div>
  )
}
