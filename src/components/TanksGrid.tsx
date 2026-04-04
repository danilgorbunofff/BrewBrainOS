'use client'

import { useOptimistic, startTransition, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DeleteConfirmButton } from '@/components/DeleteConfirmButton'
import { AddTankForm } from '@/components/AddTankForm'
import { deleteTank } from '@/app/(app)/tanks/actions'
import { LucideWaves, LucideFlaskConical, LucidePlus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Tank {
  id: string
  name: string
  status: string | null
  capacity: number | null
  brewery_id: string
  current_batch_id?: string | null
}

type OptimisticAction =
  | { type: 'delete'; id: string }
  | { type: 'add'; tank: Tank }

function optimisticReducer(state: Tank[], action: OptimisticAction): Tank[] {
  if (action.type === 'delete') {
    return state.filter(t => t.id !== action.id)
  }
  if (action.type === 'add') {
    const newState = [action.tank, ...state]
    return newState.sort((a, b) => a.name.localeCompare(b.name))
  }
  return state
}

// ─── Individual Tank Card ────────────────────────────────────────────────────

const cardVariants = {
  hidden: { opacity: 0, scale: 0.92, y: 12 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit:   { opacity: 0, scale: 0.88, y: -8 },
}

function TankCard({
  tank,
  onOptimisticDelete,
}: {
  tank: Tank
  onOptimisticDelete: () => void
}) {
  const isFermenting = tank.status === 'fermenting'
  const needsBatch = isFermenting && !tank.current_batch_id

  return (
    <motion.div
      layout
      layoutId={tank.id}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
    >
      <Link 
        prefetch={false}
        href={`/tank/${tank.id}`} 
        className={cn(
          "block group", 
          tank.brewery_id === '' && "pointer-events-none opacity-70 cursor-wait"
        )}
      >
        <Card className={cn(
          "h-full relative border-border overflow-hidden transition-colors duration-300",
          needsBatch ? "border-orange-500/50 bg-orange-500/[0.02]" : "hover:border-primary/20"
        )}>
          {/* Fermenting pulse indicator */}
          {isFermenting && (
            <motion.div
              className="absolute top-0 right-0 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <span className={cn(
                "flex h-3 w-3 rounded-full animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.8)]",
                needsBatch ? "bg-orange-500" : "bg-primary"
              )} />
            </motion.div>
          )}

          {/* Delete button — stops link propagation */}
          <div
            className="absolute top-4 right-4 z-10"
            onClick={(e) => e.preventDefault()}
          >
            <DeleteConfirmButton
              action={deleteTank}
              hiddenInputs={{ tankId: tank.id }}
              itemName={tank.name}
              onOptimisticDelete={onOptimisticDelete}
            />
          </div>

          <CardHeader className="pb-2">
            <span className={cn(
              "text-[10px] font-black uppercase tracking-[0.2em] mb-1",
              needsBatch ? "text-orange-500" : "text-muted-foreground"
            )}>
              {needsBatch ? 'No Batch Assigned' : isFermenting ? 'Active Cycle' : 'Ready'}
            </span>
            <CardTitle className="text-4xl tracking-tighter group-hover:text-primary transition-colors">
              {tank.name}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Animated progress bar */}
            <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
              <motion.div
                className={cn(
                  'h-full rounded-full',
                  isFermenting ? (needsBatch ? 'bg-orange-500/50' : 'bg-primary') : 'bg-muted-foreground/30'
                )}
                initial={{ width: '0%' }}
                animate={{ width: isFermenting ? '65%' : '0%' }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.1 }}
              />
            </div>

            <div className="flex justify-between items-center">
              <span className={cn(
                "text-sm font-bold capitalize",
                needsBatch ? "text-orange-500/70" : "text-muted-foreground"
              )}>
                {tank.status?.replace('-', ' ')}
              </span>
              <span className="text-xs font-mono font-black text-muted-foreground">
                {tank.capacity || '??'} BBL
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  )
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyVessels({ addFormRef }: { addFormRef: React.RefObject<HTMLDivElement | null> }) {
  const scrollToAdd = () => {
    addFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    addFormRef.current?.querySelector('input')?.focus()
  }

  return (
    <motion.div
      className="col-span-full py-24 text-center glass rounded-[3rem] border-border"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Animated vessel illustration */}
      <div className="relative mx-auto mb-8 w-24 h-24">
        <div className="absolute inset-0 rounded-full bg-primary/5 border border-primary/10 animate-ping" style={{ animationDuration: '3s' }} />
        <div className="relative bg-card/80 h-24 w-24 rounded-3xl flex items-center justify-center border border-border shadow-2xl">
          <LucideWaves className="h-10 w-10 text-muted-foreground" />
        </div>
      </div>

      <h3 className="text-2xl font-black text-foreground tracking-tight mb-2">
        No Vessels Initialized
      </h3>
      <p className="text-muted-foreground font-medium max-w-xs mx-auto mb-8">
        Standardize your production floor by registering your fermenters and brite tanks.
      </p>

      <Button
        onClick={scrollToAdd}
        className="gap-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-black shadow-[0_0_20px_rgba(245,158,11,0.1)] hover:shadow-[0_0_30px_rgba(245,158,11,0.2)] transition-all"
      >
        <LucidePlus className="h-4 w-4" />
        Add Your First Vessel
      </Button>
    </motion.div>
  )
}

// ─── Main Grid ───────────────────────────────────────────────────────────────

export function TanksGrid({ tanks: initialTanks }: { tanks: Tank[] }) {
  const addFormRef = useRef<HTMLDivElement>(null)
  const [tanks, dispatchOptimistic] = useOptimistic(initialTanks, optimisticReducer)

  const handleOptimisticAdd = (id: string, name: string, capacity?: number) => {
    const phantom: Tank = {
      id,
      name,
      capacity: capacity ?? null,
      status: 'ready',
      brewery_id: '',
    }
    startTransition(() => {
      dispatchOptimistic({ type: 'add', tank: phantom })
    })
  }

  return (
    <div className="space-y-8">
      {/* Add form ref wrapper */}
      <div ref={addFormRef}>
        <AddTankForm onOptimisticAdd={handleOptimisticAdd} />
      </div>

      <AnimatePresence mode="popLayout">
        {tanks.length === 0 ? (
          <EmptyVessels key="empty" addFormRef={addFormRef} />
        ) : (
          <motion.div
            key="grid"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
            layout
          >
            <AnimatePresence mode="popLayout">
              {tanks.map(tank => (
                <TankCard
                  key={tank.id}
                  tank={tank}
                  onOptimisticDelete={() =>
                    startTransition(() => {
                      dispatchOptimistic({ type: 'delete', id: tank.id })
                    })
                  }
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
