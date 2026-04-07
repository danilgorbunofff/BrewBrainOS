'use client'

import { ThemeProvider as NextThemeProvider } from 'next-themes'
import * as React from 'react'

// Suppress the React 19 "Encountered a script tag" warning in development.
// next-themes uses a script tag for FOUC prevention, which React 19 warns about.
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const originalError = console.error
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  console.error = (...args: any[]) => {
    if (typeof args[0] === 'string' && args[0].includes('Encountered a script tag')) {
      return
    }
    // Only call originalError if it's NOT the current monkey-patched version
    // Although moving outside the component already mostly solves this,
    // we can also add a check just in case.
    originalError.apply(console, args)
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      {children}
    </NextThemeProvider>
  )
}
