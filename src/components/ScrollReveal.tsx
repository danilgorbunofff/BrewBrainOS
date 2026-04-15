'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

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
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const staticTransform =
    direction === 'up' ? `translateY(${distance}px)` :
    direction === 'down' ? `translateY(-${distance}px)` :
    direction === 'left' ? `translateX(${distance}px)` :
    `translateX(-${distance}px)`

  if (!mounted) {
    return (
      <div style={{ opacity: 0, transform: staticTransform }}>
        {children}
      </div>
    )
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
