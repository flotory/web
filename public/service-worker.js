const CACHE_NAME = 'flotory-v10'
const APP_SHELL = [
  '/dashboard',
  '/wallet',
  '/login',
  '/manifest.webmanifest',
  '/favicon.png',
  '/icons/icon-180.png?v=gold-cream-f-20260605-webpad',
  '/icons/icon-192.png?v=gold-cream-f-20260605-webpad',
  '/icons/icon-512.png?v=gold-cream-f-20260605-webpad',
]

function isCacheableRequest(request) {
  if (request.method !== 'GET') {
    return false
  }

  const url = new URL(request.url)

  if (url.pathname.startsWith('/api')) {
    return false
  }

  return url.origin === self.location.origin && (url.protocol === 'http:' || url.protocol === 'https:')
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const request = event.request

  if (!isCacheableRequest(request)) {
    return
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => undefined)
        }

        return response
      })
      .catch(() => caches.match(request).then((cached) => cached ?? caches.match('/wallet'))),
  )
})
