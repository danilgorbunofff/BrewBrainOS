'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { PurchaseOrder, Supplier } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { LucidePlus, LucideExternalLink, LucideSearch } from 'lucide-react'

interface PurchaseOrdersTableProps {
  orders: (PurchaseOrder & { supplier?: Supplier })[]
}

type StatusFilter = 'All' | 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'canceled'
type PaymentFilter = 'All' | 'unpaid' | 'partial' | 'paid'

export function PurchaseOrdersTable({ orders }: PurchaseOrdersTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('All')
  const [filterPayment, setFilterPayment] = useState<PaymentFilter>('All')
  // eslint-disable-next-line react-hooks/purity
  const now = useMemo(() => Date.now(), [])

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.supplier?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = filterStatus === 'All' || order.status === filterStatus
    const matchesPayment = filterPayment === 'All' || order.payment_status === filterPayment

    return matchesSearch && matchesStatus && matchesPayment
  })

  // Helper: Get status badge color
  const getStatusColor = (status: PurchaseOrder['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
      case 'shipped':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100'
      case 'delivered':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
      case 'canceled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
      default:
        return 'bg-slate-100 text-slate-800'
    }
  }

  // Helper: Get payment badge color
  const getPaymentColor = (status: PurchaseOrder['payment_status']) => {
    switch (status) {
      case 'unpaid':
        return 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-200 border border-red-200 dark:border-red-800'
      case 'partial':
        return 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800'
      case 'paid':
        return 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-200 border border-green-200 dark:border-green-800'
      default:
        return 'bg-slate-50 text-slate-700'
    }
  }

  // Helper: Calculate days since order
  const getDaysAgo = (date: string) => {
    const days = Math.floor((now - new Date(date).getTime()) / (1000 * 60 * 60 * 24))
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    return `${days} days ago`
  }

  // Helper: Check if order is late
  const isOrderLate = (order: PurchaseOrder) => {
    if (!order.expected_delivery_date || order.status === 'delivered' || order.status === 'canceled') {
      return false
    }
    return new Date() > new Date(order.expected_delivery_date)
  }

  // Empty state
  if (orders.length === 0) {
    return (
      <div className="py-16 text-center border rounded-lg bg-slate-50 dark:bg-slate-900">
        <div className="max-w-xs mx-auto space-y-4">
          <p className="text-slate-600 dark:text-slate-400">
            No purchase orders yet. Create your first order to start tracking.
          </p>
          <Link href="/purchase-orders/create">
            <Button>
              <LucidePlus className="w-4 h-4 mr-2" />
              Create Order
            </Button>
          </Link>
        </div>
      </div>
    )
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
              placeholder="Search by order number, supplier, or invoice..."
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex gap-2 flex-wrap md:flex-nowrap">
          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as StatusFilter)}
            className="px-3 py-2 border rounded-md bg-white dark:bg-slate-900 dark:border-slate-700 text-sm"
          >
            <option>All</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="canceled">Canceled</option>
          </select>

          {/* Payment filter */}
          <select
            value={filterPayment}
            onChange={(e) => setFilterPayment(e.target.value as PaymentFilter)}
            className="px-3 py-2 border rounded-md bg-white dark:bg-slate-900 dark:border-slate-700 text-sm"
          >
            <option>All</option>
            <option value="unpaid">Unpaid</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
          </select>

          {/* Create button */}
          <Link href="/purchase-orders/create">
            <Button size="sm">
              <LucidePlus className="w-4 h-4 mr-2" />
              New Order
            </Button>
          </Link>
        </div>
      </div>

      {/* Results counter */}
      <div className="text-sm text-slate-600 dark:text-slate-400">
        Showing {filteredOrders.length} of {orders.length} orders
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-900">
                <TableHead className="font-bold">Order #</TableHead>
                <TableHead className="font-bold">Supplier</TableHead>
                <TableHead className="font-bold">Date</TableHead>
                <TableHead className="font-bold">Status</TableHead>
                <TableHead className="font-bold">Payment</TableHead>
                <TableHead className="font-bold text-right">Amount</TableHead>
                <TableHead className="font-bold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => {
                const late = isOrderLate(order)
                return (
                  <TableRow 
                    key={order.id}
                    className={late ? 'bg-red-50 dark:bg-red-950/20' : ''}
                  >
                    {/* Order Number */}
                    <TableCell className="font-mono font-bold">
                      <Link
                        href={`/purchase-orders/${order.id}`}
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {order.order_number}
                      </Link>
                    </TableCell>

                    {/* Supplier */}
                    <TableCell>
                      {order.supplier ? (
                        <Link
                          href={`/suppliers/${order.supplier.id}`}
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {order.supplier.name}
                        </Link>
                      ) : (
                        <span className="text-slate-400">Unknown Supplier</span>
                      )}
                    </TableCell>

                    {/* Order Date */}
                    <TableCell className="text-sm">
                      <div className="font-medium">{new Date(order.order_date).toLocaleDateString()}</div>
                      <div className="text-slate-600 dark:text-slate-400 text-xs">
                        {getDaysAgo(order.order_date)}
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge className={getStatusColor(order.status)}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </Badge>
                        {late && order.status !== 'delivered' && (
                          <span className="text-xs text-red-600 dark:text-red-400 font-semibold">
                            🔴 Late
                          </span>
                        )}
                        {order.any_issues && (
                          <span className="text-xs text-orange-600 dark:text-orange-400 font-semibold">
                            ⚠️ Issues
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Payment Status */}
                    <TableCell>
                      <Badge className={getPaymentColor(order.payment_status)}>
                        {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
                      </Badge>
                    </TableCell>

                    {/* Amount */}
                    <TableCell className="text-right font-bold">
                      {order.total_cost ? `$${order.total_cost.toFixed(2)}` : '—'}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <Link
                        href={`/purchase-orders/${order.id}`}
                        title="View details"
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded inline-block"
                      >
                        <LucideExternalLink className="w-4 h-4" />
                      </Link>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* No results */}
      {filteredOrders.length === 0 && orders.length > 0 && (
        <div className="py-8 text-center border rounded-lg bg-slate-50 dark:bg-slate-900">
          <p className="text-slate-600 dark:text-slate-400">
            No purchase orders match your search or filters.
          </p>
        </div>
      )}
    </div>
  )
}
