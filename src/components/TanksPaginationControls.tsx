'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useTankGridColumns } from '@/hooks/useTankGridColumns'
import { PaginationControls } from '@/components/PaginationControls'

/**
 * All allowed tank page sizes. Every value is a multiple of 4, which means
 * they are also multiples of 2 — so no partial rows appear on lg (4-col) or
 * md (2-col) grids for any page except the last.
 */
export const TANK_PAGE_SIZES = [4, 8, 12, 16, 20, 24] as const

interface TanksPaginationControlsProps {
  currentPage: number
  pageSize: number
  totalCount: number
}

export function TanksPaginationControls({
  currentPage,
  pageSize,
  totalCount,
}: TanksPaginationControlsProps) {
  const columns = useTankGridColumns()
  const router = useRouter()
  const pathname = usePathname()

  // Only show page sizes that fill complete rows for the current column count.
  // Since all TANK_PAGE_SIZES are multiples of 4 this is always the full set,
  // but filtering keeps the logic correct if breakpoints ever change.
  const alignedSizes = TANK_PAGE_SIZES.filter(s => s % columns === 0)
  const effectiveSizes = alignedSizes.length > 0 ? alignedSizes : TANK_PAGE_SIZES

  // Auto-correct: if the active page size doesn't align with the current column
  // count (e.g. the user arrived with a legacy URL), redirect to the nearest
  // larger column-aligned size without reloading the page.
  useEffect(() => {
    if (columns <= 1 || pageSize % columns === 0) return
    const corrected =
      effectiveSizes.find(s => s >= pageSize) ??
      effectiveSizes[effectiveSizes.length - 1]
    router.replace(`${pathname}?page=${currentPage}&limit=${corrected}`, {
      scroll: false,
    })
  }, [columns, pageSize, currentPage, pathname, router, effectiveSizes])

  return (
    <PaginationControls
      currentPage={currentPage}
      pageSize={pageSize}
      totalCount={totalCount}
      pageSizes={effectiveSizes}
    />
  )
}
