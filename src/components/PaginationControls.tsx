'use client'

import { useRouter, usePathname } from 'next/navigation'
import { LucideChevronLeft, LucideChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const DEFAULT_PAGE_SIZES = [10, 20, 50] as const

interface PaginationControlsProps {
  currentPage: number
  pageSize: number
  totalCount: number
  pageSizes?: readonly number[]
  className?: string
}

export function PaginationControls({
  currentPage,
  pageSize,
  totalCount,
  pageSizes = DEFAULT_PAGE_SIZES,
  className,
}: PaginationControlsProps) {
  const router = useRouter()
  const pathname = usePathname()

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const rangeStart = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const rangeEnd = Math.min(currentPage * pageSize, totalCount)

  function navigate(page: number, limit: number) {
    router.push(`${pathname}?page=${page}&limit=${limit}`, { scroll: false })
  }

  if (totalCount === 0) return null

  return (
    <div className={`flex items-center justify-between px-2 py-3 ${className ?? ''}`}>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground font-medium">Per page:</span>
        <Select
          value={String(pageSize)}
          onValueChange={(val) => navigate(1, Number(val))}
        >
          <SelectTrigger size="sm" className="w-20" aria-label="Items per page">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizes.map((s) => (
              <SelectItem key={s} value={String(s)}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs font-mono text-muted-foreground">
          {rangeStart}–{rangeEnd} of {totalCount}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={currentPage <= 1}
            onClick={() => navigate(currentPage - 1, pageSize)}
            aria-label="Previous page"
          >
            <LucideChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs font-mono text-muted-foreground min-w-[3rem] text-center">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={currentPage >= totalPages}
            onClick={() => navigate(currentPage + 1, pageSize)}
            aria-label="Next page"
          >
            <LucideChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
