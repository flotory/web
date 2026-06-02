const DEFAULT_TTL_MS = 30_000

interface CacheEntry<T> {
  data: T
  fetchedAt: number
}

const cache = new Map<string, CacheEntry<unknown>>()
const inflight = new Map<string, Promise<unknown>>()

export function readCache<T>(key: string, ttlMs = DEFAULT_TTL_MS): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined
  if (!entry) return null
  if (Date.now() - entry.fetchedAt > ttlMs) {
    cache.delete(key)
    return null
  }
  return entry.data
}

export function writeCache<T>(key: string, data: T) {
  cache.set(key, { data, fetchedAt: Date.now() })
}

export function invalidateCache(prefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key)
  }
  for (const key of inflight.keys()) {
    if (key.startsWith(prefix)) inflight.delete(key)
  }
}

export async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  fresh = false,
  ttlMs = DEFAULT_TTL_MS,
): Promise<T> {
  if (!fresh) {
    const cached = readCache<T>(key, ttlMs)
    if (cached !== null) return cached
  }

  const pending = inflight.get(key) as Promise<T> | undefined
  if (pending) return pending

  const promise = fetcher()
    .then((data) => {
      writeCache(key, data)
      return data
    })
    .finally(() => {
      inflight.delete(key)
    })

  inflight.set(key, promise)
  return promise
}
