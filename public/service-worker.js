const CACHE_NAME = 'flotory-v11'
const APP_SHELL = [
  '/login',
  '/app',
  '/manifest.webmanifest',
  '/favicon.png',
]

function isNavigationRequest(request) {
  if (request.mode === 'navigate') {
    return true
  }

  const accept = request.headers.get('accept') ?? ''

  return accept.includes('text/html')
}

function isCacheableRequest(request) {
  if (request.method !== 'GET') {
    return false
  }

  const url = new URL(request.url)

  if (url.pathname.startsWith('/api')) {
    return false
  }

  if (isNavigationRequest(request)) {
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

  if (isNavigationRequest(request)) {
    event.respondWith(fetch(request))
    return
  }

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
      .catch(() => caches.match(request)),
  )
})
