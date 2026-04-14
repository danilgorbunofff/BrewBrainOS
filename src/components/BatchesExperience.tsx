'use client'

import { startTransition, useOptimistic } from 'react'
import { AddBatchForm } from '@/components/AddBatchForm'
import { BatchesTable } from '@/components/BatchesTable'
import { PaginationControls } from '@/components/PaginationControls'
import type { BatchListItem } from '@/types/database'

type OptimisticBatchAction =
  | { type: 'add'; batch: BatchListItem }
  | { type: 'remove'; id: string }

function optimisticBatchReducer(state: BatchListItem[], action: OptimisticBatchAction) {
  if (action.type === 'add') {
    return [action.batch, ...state.filter((batch) => batch.id !== action.batch.id)]
  }

  if (action.type === 'remove') {
    return state.filter((batch) => batch.id !== action.id)
  }

  return state
}

export function BatchesExperience({
  batches,
  currentPage,
  pageSize,
  totalCount,
}: {
  batches: BatchListItem[]
  currentPage: number
  pageSize: number
  totalCount: number
}) {
  const [optimisticBatches, dispatchOptimistic] = useOptimistic(batches, optimisticBatchReducer)

  const handleOptimisticAdd = (id: string, recipeName: string, og: number | null) => {
    startTransition(() => {
      dispatchOptimistic({
        type: 'add',
        batch: {
          id,
          recipe_name: recipeName,
          status: 'fermenting',
          og,
          fg: null,
          created_at: new Date().toISOString(),
        },
      })
    })
  }

  const handleOptimisticRollback = (id: string) => {
    startTransition(() => {
      dispatchOptimistic({ type: 'remove', id })
    })
  }

  return (
    <div className="space-y-6 md:space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-8 border-b border-border pb-6 md:pb-10">
        <div>
          <p className="text-muted-foreground font-medium text-sm md:text-base">Production cycle monitoring and analytics.</p>
        </div>

        <AddBatchForm
          onOptimisticAdd={handleOptimisticAdd}
          onOptimisticRollback={handleOptimisticRollback}
        />
      </div>

      <BatchesTable
        batches={optimisticBatches}
        onOptimisticAdd={handleOptimisticAdd}
        onOptimisticRollback={handleOptimisticRollback}
      />

      <PaginationControls
        currentPage={currentPage}
        pageSize={pageSize}
        totalCount={totalCount}
      />
    </div>
  )
}