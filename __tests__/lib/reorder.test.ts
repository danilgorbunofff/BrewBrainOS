import { describe, expect, it } from 'vitest'

import { classifyReorderAlert } from '@/lib/reorder'

describe('classifyReorderAlert', () => {
  it('marks zero stock as an immediate critical stockout', () => {
    expect(classifyReorderAlert(0, 10)).toEqual({
      type: 'stockout_imminent',
      severity: 'critical',
      daysUntilStockout: 0,
    })
  })

  it('marks low days remaining as an imminent stockout when usage data is available', () => {
    expect(classifyReorderAlert(4, 10, 14)).toEqual({
      type: 'stockout_imminent',
      severity: 'critical',
      daysUntilStockout: 2,
    })
  })

  it('marks inventory at half the reorder point as a warning-level critical low', () => {
    expect(classifyReorderAlert(5, 10)).toEqual({
      type: 'critical_low',
      severity: 'warning',
    })
  })

  it('marks less than one week of stock as critical low when usage is available', () => {
    expect(classifyReorderAlert(8, 10, 10)).toEqual({
      type: 'critical_low',
      severity: 'warning',
      daysUntilStockout: 6,
    })
  })

  it('returns an informational reorder point hit when stock is above the critical threshold', () => {
    expect(classifyReorderAlert(8, 10)).toEqual({
      type: 'reorder_point_hit',
      severity: 'info',
    })
  })
})