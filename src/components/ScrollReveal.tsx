'use client'

import { useSyncExternalStore } from 'react'
import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

const subscribe = () => () => {}

/**
 * `false` on the server and during hydration, `true` once React has taken over.
 * Keeps the server markup fully visible for crawlers and no-JS visitors.
 */
function useIsHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
}

interface ScrollRevealProps {
  children: ReactNode
  delay?: number
  direction?: 'up' | 'down' | 'left' | 'right'
  distance?: number
  duration?: number
}

export function ScrollReveal({ 
  children, 
  delay = 0, 
  direction = 'up',
  distance = 40,
  duration = 0.8
}: ScrollRevealProps) {
  const hydrated = useIsHydrated()

  if (!hydrated) {
    return <div>{children}</div>
  }

  const motionInitial =
    direction === 'up' ? { y: distance } :
    direction === 'down' ? { y: -distance } :
    direction === 'left' ? { x: distance } :
    { x: -distance }

  return (
    <motion.div
      initial={{ opacity: 0, ...motionInitial }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      {children}
    </motion.div>
  )
}
