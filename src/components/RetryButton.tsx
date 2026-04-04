'use client'

export function RetryButton() {
  return (
    <button
      onClick={() => window.location.reload()}
      className="px-6 py-3 rounded-xl bg-secondary border border-border text-sm font-bold text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-all"
    >
      Retry Connection
    </button>
  )
}
