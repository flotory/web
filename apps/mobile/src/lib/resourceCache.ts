const DEFAULT_TTL_MS = 30_000

interface CacheEntry<T> {
  data: T
  fetchedAt: number
}

const cache = new Map<string, CacheEntry<unknown>>()
const inflight = new Map<string, Promise<unknown>>()
const requestVersion = new Map<string, number>()

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
  if (pending && !fresh) return pending

  const version = (requestVersion.get(key) ?? 0) + 1
  requestVersion.set(key, version)

  const promise = fetcher()
    .then((data) => {
      // Ignore stale completions when a newer fresh request has started.
      if (requestVersion.get(key) === version) {
        writeCache(key, data)
      }
      return data
    })
    .finally(() => {
      if (requestVersion.get(key) === version) {
        inflight.delete(key)
      }
    })

  inflight.set(key, promise)
  return promise
}
