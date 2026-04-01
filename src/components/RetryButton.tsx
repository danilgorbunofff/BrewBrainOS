'use client'

export function RetryButton() {
  return (
    <button
      onClick={() => window.location.reload()}
      className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-bold text-zinc-400 hover:bg-white/10 hover:text-white transition-all"
    >
      Retry Connection
    </button>
  )
}
