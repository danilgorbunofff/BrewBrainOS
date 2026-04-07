import { useSyncExternalStore } from 'react'

const emptySubscribe = () => () => {}

/**
 * React 19-safe mount detection without triggering setState-in-effect warnings.
 * Uses useSyncExternalStore to avoid cascading renders.
 */
export function useHasMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false)
}
