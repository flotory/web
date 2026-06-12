type SurfaceRefreshListener = () => void

const listeners = new Set<SurfaceRefreshListener>()

export function subscribeCustomerSurfaceRefresh(listener: SurfaceRefreshListener): () => void {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

export function notifyCustomerSurfaceRefresh(): void {
  for (const listener of listeners) {
    listener()
  }
}
