// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest'

// ─── Hoisted Mocks ──────────────────────────────────────────────────
const { mockCreateClient } = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
}))

vi.mock('@/utils/supabase/server', () => ({
  createClient: mockCreateClient,
}))

vi.mock('@/lib/schemas', () => ({
  supplierSchema: {
    safeParse: (d: Record<string, unknown>) =>
      d.name ? { success: true, data: d } : { success: false, error: { issues: [{ message: 'Name required' }] } },
  },
  purchaseOrderSchema: {
    safeParse: (d: Record<string, unknown>) =>
      d.supplier_id ? { success: true, data: d } : { success: false, error: { issues: [{ message: 'Supplier required' }] } },
  },
  supplierRatingSchema: {
    safeParse: (d: Record<string, unknown>) =>
      d.rating_date ? { success: true, data: d } : { success: false, error: { issues: [{ message: 'Rating date required' }] } },
  },
}))

// ─── Helpers ────────────────────────────────────────────────────────
function chainable(resolveValue: { data: unknown; error: unknown }) {
  const proxy: Record<string, unknown> = {}
  const handler = () => proxy
  proxy.select = handler
  proxy.eq = handler
  proxy.order = handler
  proxy.insert = handler
  proxy.update = handler
  proxy.delete = handler
  proxy.single = () => Promise.resolve(resolveValue)
  proxy.maybeSingle = () => Promise.resolve(resolveValue)
  proxy.then = (resolve: (v: unknown) => void) => Promise.resolve(resolveValue).then(resolve)
  return proxy
}

function makeSupa(fromImpl?: (t: string) => unknown) {
  return {
    from: fromImpl || (() => chainable({ data: null, error: null })),
    auth: { getUser: () => Promise.resolve({ data: { user: { id: 'u-1' } } }) },
  }
}

// ─── Tests ──────────────────────────────────────────────────────────
describe('supplier-actions CRUD', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  // ─── getSuppliers ────────────────────────────────────────────
  describe('getSuppliers', () => {
    it('returns suppliers for brewery', async () => {
      mockCreateClient.mockResolvedValue(makeSupa(() =>
        chainable({ data: [{ id: 's1', name: 'A' }], error: null })
      ))
      const { getSuppliers } = await import('@/app/actions/supplier-actions')
      const r = await getSuppliers('brew-1')
      expect(r.success).toBe(true)
      expect(r.data).toHaveLength(1)
    })

    it('returns error on failure', async () => {
      mockCreateClient.mockResolvedValue(makeSupa(() =>
        chainable({ data: null, error: { message: 'fail' } })
      ))
      const { getSuppliers } = await import('@/app/actions/supplier-actions')
      const r = await getSuppliers('brew-1')
      expect(r.success).toBe(false)
    })
  })

  // ─── getSupplier ─────────────────────────────────────────────
  describe('getSupplier', () => {
    it('returns single supplier', async () => {
      mockCreateClient.mockResolvedValue(makeSupa(() =>
        chainable({ data: { id: 's1', name: 'A' }, error: null })
      ))
      const { getSupplier } = await import('@/app/actions/supplier-actions')
      const r = await getSupplier('s1')
      expect(r.success).toBe(true)
      expect(r.data?.name).toBe('A')
    })

    it('returns error when not found', async () => {
      mockCreateClient.mockResolvedValue(makeSupa(() =>
        chainable({ data: null, error: null })
      ))
      const { getSupplier } = await import('@/app/actions/supplier-actions')
      const r = await getSupplier('missing')
      expect(r.success).toBe(false)
    })
  })

  // ─── createSupplier ──────────────────────────────────────────
  describe('createSupplier', () => {
    it('creates supplier successfully', async () => {
      mockCreateClient.mockResolvedValue(makeSupa(() =>
        chainable({ data: { id: 's-new', name: 'New' }, error: null })
      ))
      const { createSupplier } = await import('@/app/actions/supplier-actions')
      const r = await createSupplier('brew-1', { name: 'New', brewery_id: 'brew-1' } as never)
      expect(r.success).toBe(true)
    })

    it('returns error on validation failure', async () => {
      mockCreateClient.mockResolvedValue(makeSupa())
      const { createSupplier } = await import('@/app/actions/supplier-actions')
      const r = await createSupplier('brew-1', {} as never) // missing name
      expect(r.success).toBe(false)
      expect(r.error).toContain('Name required')
    })

    it('returns error when not authenticated', async () => {
      mockCreateClient.mockResolvedValue({
        ...makeSupa(),
        auth: { getUser: () => Promise.resolve({ data: { user: null } }) },
      })
      const { createSupplier } = await import('@/app/actions/supplier-actions')
      const r = await createSupplier('brew-1', { name: 'X' } as never)
      expect(r.success).toBe(false)
      expect(r.error).toBe('Unauthorized')
    })
  })

  // ─── updateSupplier ──────────────────────────────────────────
  describe('updateSupplier', () => {
    it('updates supplier successfully', async () => {
      mockCreateClient.mockResolvedValue(makeSupa(() =>
        chainable({ data: { id: 's1', name: 'Updated' }, error: null })
      ))
      const { updateSupplier } = await import('@/app/actions/supplier-actions')
      const r = await updateSupplier('s1', { name: 'Updated' } as never)
      expect(r.success).toBe(true)
    })

    it('returns error when update fails', async () => {
      mockCreateClient.mockResolvedValue(makeSupa(() =>
        chainable({ data: null, error: { message: 'RLS' } })
      ))
      const { updateSupplier } = await import('@/app/actions/supplier-actions')
      const r = await updateSupplier('s1', { name: 'X' } as never)
      expect(r.success).toBe(false)
    })
  })

  // ─── deleteSupplier ──────────────────────────────────────────
  describe('deleteSupplier', () => {
    it('soft-deletes (marks inactive) successfully', async () => {
      mockCreateClient.mockResolvedValue(makeSupa(() => {
        const p: Record<string, unknown> = {}
        p.update = () => ({ eq: () => Promise.resolve({ error: null }) })
        return p
      }))
      const { deleteSupplier } = await import('@/app/actions/supplier-actions')
      const r = await deleteSupplier('s1')
      expect(r.success).toBe(true)
    })

    it('returns error on failure', async () => {
      mockCreateClient.mockResolvedValue(makeSupa(() => {
        const p: Record<string, unknown> = {}
        p.update = () => ({ eq: () => Promise.resolve({ error: { message: 'fail' } }) })
        return p
      }))
      const { deleteSupplier } = await import('@/app/actions/supplier-actions')
      const r = await deleteSupplier('s1')
      expect(r.success).toBe(false)
    })
  })

  // ─── getSupplierPerformance ──────────────────────────────────
  describe('getSupplierPerformance', () => {
    it('computes metrics with ratings and orders', async () => {
      const fromImpl = (table: string) => {
        if (table === 'supplier_ratings') {
          return chainable({
            data: [
              { quality_rating: 4, delivery_rating: 5, reliability_rating: 3, pricing_rating: 4, would_order_again: true },
              { quality_rating: 5, delivery_rating: 4, reliability_rating: 5, pricing_rating: 3, would_order_again: false },
            ],
            error: null,
          })
        }
        if (table === 'purchase_orders') {
          return chainable({
            data: [
              {
                order_date: '2026-01-01',
                expected_delivery_date: '2026-01-10',
                actual_delivery_date: '2026-01-08',
                any_issues: false,
                total_cost: 500,
              },
              {
                order_date: '2026-02-01',
                expected_delivery_date: '2026-02-05',
                actual_delivery_date: '2026-02-10',
                any_issues: true,
                total_cost: 300,
              },
            ],
            error: null,
          })
        }
        if (table === 'suppliers') {
          return chainable({ data: { avg_delivery_days: 7 }, error: null })
        }
        return chainable({ data: null, error: null })
      }
      mockCreateClient.mockResolvedValue(makeSupa(fromImpl))
      const { getSupplierPerformance } = await import('@/app/actions/supplier-actions')
      const r = await getSupplierPerformance('s1')
      expect(r.success).toBe(true)
      expect(r.data!.total_orders).toBe(2)
      expect(r.data!.avg_quality_rating).toBe(4.5)
      expect(r.data!.on_time_percentage).toBe(50)
      expect(r.data!.quality_issues_count).toBe(1)
      expect(r.data!.total_spent).toBe(800)
      expect(r.data!.would_order_again_percentage).toBe(50)
    })

    it('handles empty ratings', async () => {
      const fromImpl = (table: string) => {
        if (table === 'supplier_ratings') return chainable({ data: [], error: null })
        if (table === 'purchase_orders') return chainable({ data: [], error: null })
        if (table === 'suppliers') return chainable({ data: { avg_delivery_days: 0 }, error: null })
        return chainable({ data: null, error: null })
      }
      mockCreateClient.mockResolvedValue(makeSupa(fromImpl))
      const { getSupplierPerformance } = await import('@/app/actions/supplier-actions')
      const r = await getSupplierPerformance('s1')
      expect(r.success).toBe(true)
      expect(r.data!.avg_quality_rating).toBe(0)
      expect(r.data!.on_time_percentage).toBe(0)
    })

    it('returns error on DB failure', async () => {
      mockCreateClient.mockResolvedValue(makeSupa(() =>
        chainable({ data: null, error: { message: 'conn err' } })
      ))
      const { getSupplierPerformance } = await import('@/app/actions/supplier-actions')
      const r = await getSupplierPerformance('s1')
      expect(r.success).toBe(false)
    })
  })

  // ─── getPurchaseOrders ───────────────────────────────────────
  describe('getPurchaseOrders', () => {
    it('returns orders for brewery', async () => {
      mockCreateClient.mockResolvedValue(makeSupa(() =>
        chainable({ data: [{ id: 'po-1' }], error: null })
      ))
      const { getPurchaseOrders } = await import('@/app/actions/supplier-actions')
      const r = await getPurchaseOrders('brew-1')
      expect(r.success).toBe(true)
      expect(r.data).toHaveLength(1)
    })
  })

  // ─── getPurchaseOrder ────────────────────────────────────────
  describe('getPurchaseOrder', () => {
    it('returns single order', async () => {
      mockCreateClient.mockResolvedValue(makeSupa(() =>
        chainable({ data: { id: 'po-1', order_number: 'PO-001' }, error: null })
      ))
      const { getPurchaseOrder } = await import('@/app/actions/supplier-actions')
      const r = await getPurchaseOrder('po-1')
      expect(r.success).toBe(true)
    })

    it('returns error when not found', async () => {
      mockCreateClient.mockResolvedValue(makeSupa(() =>
        chainable({ data: null, error: null })
      ))
      const { getPurchaseOrder } = await import('@/app/actions/supplier-actions')
      const r = await getPurchaseOrder('missing')
      expect(r.success).toBe(false)
    })
  })

  // ─── createPurchaseOrder ─────────────────────────────────────
  describe('createPurchaseOrder', () => {
    it('creates order successfully', async () => {
      mockCreateClient.mockResolvedValue(makeSupa(() =>
        chainable({ data: { id: 'po-new' }, error: null })
      ))
      const { createPurchaseOrder } = await import('@/app/actions/supplier-actions')
      const r = await createPurchaseOrder('brew-1', 'sup-1', { status: 'pending' } as never)
      expect(r.success).toBe(true)
    })

    it('returns error when not authenticated', async () => {
      mockCreateClient.mockResolvedValue({
        ...makeSupa(),
        auth: { getUser: () => Promise.resolve({ data: { user: null } }) },
      })
      const { createPurchaseOrder } = await import('@/app/actions/supplier-actions')
      const r = await createPurchaseOrder('brew-1', 'sup-1', {} as never)
      expect(r.success).toBe(false)
    })
  })

  // ─── updatePurchaseOrder ─────────────────────────────────────
  describe('updatePurchaseOrder', () => {
    it('updates order successfully', async () => {
      mockCreateClient.mockResolvedValue(makeSupa(() =>
        chainable({ data: { id: 'po-1' }, error: null })
      ))
      const { updatePurchaseOrder } = await import('@/app/actions/supplier-actions')
      const r = await updatePurchaseOrder('po-1', { status: 'shipped' } as never)
      expect(r.success).toBe(true)
    })
  })

  // ─── updatePurchaseOrderStatus ───────────────────────────────
  describe('updatePurchaseOrderStatus', () => {
    it('delegates to updatePurchaseOrder', async () => {
      mockCreateClient.mockResolvedValue(makeSupa(() =>
        chainable({ data: { id: 'po-1', status: 'delivered' }, error: null })
      ))
      const { updatePurchaseOrderStatus } = await import('@/app/actions/supplier-actions')
      const r = await updatePurchaseOrderStatus('po-1', 'delivered' as never)
      expect(r.success).toBe(true)
    })
  })

  // ─── deletePurchaseOrder ─────────────────────────────────────
  describe('deletePurchaseOrder', () => {
    it('deletes pending order', async () => {
      const fromImpl = () => {
        const chain: Record<string, unknown> = {}
        chain.select = () => ({ eq: () => ({ single: () => Promise.resolve({ data: { status: 'pending' } }) }) })
        chain.delete = () => ({ eq: () => Promise.resolve({ error: null }) })
        return chain
      }
      mockCreateClient.mockResolvedValue(makeSupa(fromImpl))
      const { deletePurchaseOrder } = await import('@/app/actions/supplier-actions')
      const r = await deletePurchaseOrder('po-1')
      expect(r.success).toBe(true)
    })

    it('rejects deleting non-pending order', async () => {
      mockCreateClient.mockResolvedValue(makeSupa(() => ({
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { status: 'shipped' } }) }) }),
      })))
      const { deletePurchaseOrder } = await import('@/app/actions/supplier-actions')
      const r = await deletePurchaseOrder('po-1')
      expect(r.success).toBe(false)
      expect(r.error).toContain('pending')
    })
  })

  // ─── getPurchaseOrderItems ───────────────────────────────────
  describe('getPurchaseOrderItems', () => {
    it('returns items for order', async () => {
      mockCreateClient.mockResolvedValue(makeSupa(() =>
        chainable({ data: [{ id: 'item-1' }], error: null })
      ))
      const { getPurchaseOrderItems } = await import('@/app/actions/supplier-actions')
      const r = await getPurchaseOrderItems('po-1')
      expect(r.success).toBe(true)
      expect(r.data).toHaveLength(1)
    })
  })

  // ─── addPurchaseOrderItem ────────────────────────────────────
  describe('addPurchaseOrderItem', () => {
    it('adds item successfully', async () => {
      mockCreateClient.mockResolvedValue(makeSupa(() =>
        chainable({ data: { id: 'item-new' }, error: null })
      ))
      const { addPurchaseOrderItem } = await import('@/app/actions/supplier-actions')
      const r = await addPurchaseOrderItem('po-1', {
        item_name: 'Cascade Hops',
        quantity_ordered: 10,
        unit_price: 5,
      } as never)
      expect(r.success).toBe(true)
    })

    it('rejects missing item name', async () => {
      mockCreateClient.mockResolvedValue(makeSupa())
      const { addPurchaseOrderItem } = await import('@/app/actions/supplier-actions')
      const r = await addPurchaseOrderItem('po-1', {
        item_name: '',
        quantity_ordered: 10,
        unit_price: 5,
      } as never)
      expect(r.success).toBe(false)
    })

    it('rejects 0 or negative quantity', async () => {
      mockCreateClient.mockResolvedValue(makeSupa())
      const { addPurchaseOrderItem } = await import('@/app/actions/supplier-actions')
      const r = await addPurchaseOrderItem('po-1', {
        item_name: 'Hops',
        quantity_ordered: 0,
        unit_price: 5,
      } as never)
      expect(r.success).toBe(false)
    })

    it('rejects negative unit price', async () => {
      mockCreateClient.mockResolvedValue(makeSupa())
      const { addPurchaseOrderItem } = await import('@/app/actions/supplier-actions')
      const r = await addPurchaseOrderItem('po-1', {
        item_name: 'Hops',
        quantity_ordered: 10,
        unit_price: -1,
      } as never)
      expect(r.success).toBe(false)
    })
  })

  // ─── updatePurchaseOrderItem ─────────────────────────────────
  describe('updatePurchaseOrderItem', () => {
    it('updates item successfully', async () => {
      mockCreateClient.mockResolvedValue(makeSupa(() =>
        chainable({ data: { id: 'item-1' }, error: null })
      ))
      const { updatePurchaseOrderItem } = await import('@/app/actions/supplier-actions')
      const r = await updatePurchaseOrderItem('item-1', { quantity_ordered: 20 } as never)
      expect(r.success).toBe(true)
    })
  })

  // ─── deletePurchaseOrderItem ─────────────────────────────────
  describe('deletePurchaseOrderItem', () => {
    it('deletes item successfully', async () => {
      mockCreateClient.mockResolvedValue(makeSupa(() => ({
        delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
      })))
      const { deletePurchaseOrderItem } = await import('@/app/actions/supplier-actions')
      const r = await deletePurchaseOrderItem('item-1')
      expect(r.success).toBe(true)
    })
  })

  // ─── getSupplierRatings ──────────────────────────────────────
  describe('getSupplierRatings', () => {
    it('returns ratings for supplier', async () => {
      mockCreateClient.mockResolvedValue(makeSupa(() =>
        chainable({ data: [{ id: 'r1', quality_rating: 4 }], error: null })
      ))
      const { getSupplierRatings } = await import('@/app/actions/supplier-actions')
      const r = await getSupplierRatings('s1')
      expect(r.success).toBe(true)
      expect(r.data).toHaveLength(1)
    })
  })

  // ─── createSupplierRating ────────────────────────────────────
  describe('createSupplierRating', () => {
    it('creates rating successfully', async () => {
      mockCreateClient.mockResolvedValue(makeSupa(() =>
        chainable({ data: { id: 'r-new' }, error: null })
      ))
      const { createSupplierRating } = await import('@/app/actions/supplier-actions')
      const r = await createSupplierRating('brew-1', {
        supplier_id: 's1',
        quality_rating: 5,
        delivery_rating: 4,
        reliability_rating: 4,
        pricing_rating: 3,
      } as never)
      expect(r.success).toBe(true)
    })

    it('returns error when not authenticated', async () => {
      mockCreateClient.mockResolvedValue({
        ...makeSupa(),
        auth: { getUser: () => Promise.resolve({ data: { user: null } }) },
      })
      const { createSupplierRating } = await import('@/app/actions/supplier-actions')
      const r = await createSupplierRating('brew-1', {} as never)
      expect(r.success).toBe(false)
    })
  })

  // ─── updateSupplierRating ────────────────────────────────────
  describe('updateSupplierRating', () => {
    it('updates rating successfully', async () => {
      mockCreateClient.mockResolvedValue(makeSupa(() =>
        chainable({ data: { id: 'r1' }, error: null })
      ))
      const { updateSupplierRating } = await import('@/app/actions/supplier-actions')
      const r = await updateSupplierRating('r1', { quality_rating: 5 } as never)
      expect(r.success).toBe(true)
    })
  })

  // ─── deleteSupplierRating ────────────────────────────────────
  describe('deleteSupplierRating', () => {
    it('deletes rating successfully', async () => {
      mockCreateClient.mockResolvedValue(makeSupa(() => ({
        delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
      })))
      const { deleteSupplierRating } = await import('@/app/actions/supplier-actions')
      const r = await deleteSupplierRating('r1')
      expect(r.success).toBe(true)
    })
  })

  // ─── recalculateSupplierMetrics ──────────────────────────────
  describe('recalculateSupplierMetrics', () => {
    it('recalculates metrics from ratings and orders', async () => {
      const fromImpl = (table: string) => {
        if (table === 'supplier_ratings') {
          return chainable({
            data: [
              { quality_rating: 4, delivery_rating: 3, reliability_rating: 5, pricing_rating: 4 },
            ],
            error: null,
          })
        }
        if (table === 'purchase_orders') {
          return chainable({
            data: [
              { order_date: '2026-01-01', actual_delivery_date: '2026-01-05', status: 'delivered' },
            ],
            error: null,
          })
        }
        if (table === 'suppliers') {
          return { update: () => ({ eq: () => Promise.resolve({ error: null }) }) }
        }
        return chainable({ data: null, error: null })
      }
      mockCreateClient.mockResolvedValue(makeSupa(fromImpl))
      const { recalculateSupplierMetrics } = await import('@/app/actions/supplier-actions')
      const r = await recalculateSupplierMetrics('s1')
      expect(r.success).toBe(true)
    })

    it('handles no orders and no ratings gracefully', async () => {
      const fromImpl = (table: string) => {
        if (table === 'supplier_ratings') return chainable({ data: [], error: null })
        if (table === 'purchase_orders') return chainable({ data: [], error: null })
        if (table === 'suppliers') return { update: () => ({ eq: () => Promise.resolve({ error: null }) }) }
        return chainable({ data: null, error: null })
      }
      mockCreateClient.mockResolvedValue(makeSupa(fromImpl))
      const { recalculateSupplierMetrics } = await import('@/app/actions/supplier-actions')
      const r = await recalculateSupplierMetrics('s1')
      expect(r.success).toBe(true)
    })

    it('returns error on update failure', async () => {
      const fromImpl = (table: string) => {
        if (table === 'supplier_ratings') return chainable({ data: [], error: null })
        if (table === 'purchase_orders') return chainable({ data: [], error: null })
        if (table === 'suppliers') return { update: () => ({ eq: () => Promise.resolve({ error: { message: 'fail' } }) }) }
        return chainable({ data: null, error: null })
      }
      mockCreateClient.mockResolvedValue(makeSupa(fromImpl))
      const { recalculateSupplierMetrics } = await import('@/app/actions/supplier-actions')
      const r = await recalculateSupplierMetrics('s1')
      expect(r.success).toBe(false)
    })
  })
})
