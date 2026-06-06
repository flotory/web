type GoogleMapsNamespace = typeof google

let loaderPromise: Promise<GoogleMapsNamespace> | null = null
let cachedRuntimeKey: string | null | undefined

export function googleMapsApiKeyFromBuild(): string {
  return (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim() ?? ''
}

export async function resolveGoogleMapsApiKey(): Promise<string> {
  const buildKey = googleMapsApiKeyFromBuild()
  if (buildKey) {
    return buildKey
  }

  if (cachedRuntimeKey !== undefined) {
    return cachedRuntimeKey ?? ''
  }

  try {
    const response = await fetch('/api/public/app-config', {
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      cachedRuntimeKey = null
      return ''
    }

    const payload = (await response.json()) as { google_maps_key?: string | null }
    const runtimeKey = payload.google_maps_key?.trim() ?? ''
    cachedRuntimeKey = runtimeKey || null
  } catch {
    cachedRuntimeKey = null
  }

  return cachedRuntimeKey ?? ''
}

export function hasGoogleMapsApiKey(): boolean {
  return googleMapsApiKeyFromBuild().length > 0
}

function setGlobalCallback(name: string, handler: () => void): void {
  ;(window as unknown as Record<string, unknown>)[name] = handler
}

function clearGlobalCallback(name: string): void {
  delete (window as unknown as Record<string, unknown>)[name]
}

export function loadGoogleMaps(apiKey?: string): Promise<GoogleMapsNamespace> {
  const key = (apiKey ?? googleMapsApiKeyFromBuild()).trim()

  if (!key) {
    return Promise.reject(new Error('Google Maps API key is not configured.'))
  }

  if (typeof google !== 'undefined' && google.maps?.places) {
    return Promise.resolve(google)
  }

  if (loaderPromise) {
    return loaderPromise
  }

  loaderPromise = new Promise((resolve, reject) => {
    const callbackName = `flotoryGoogleMapsInit_${Date.now()}`

    setGlobalCallback(callbackName, () => {
      clearGlobalCallback(callbackName)

      if (typeof google !== 'undefined' && google.maps?.places) {
        resolve(google)
        return
      }

      reject(new Error('Google Maps Places library failed to load.'))
    })

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&loading=async&callback=${callbackName}`
    script.async = true
    script.defer = true
    script.onerror = () => {
      clearGlobalCallback(callbackName)
      loaderPromise = null
      reject(new Error('Google Maps script failed to load. Check API key restrictions and enabled APIs.'))
    }

    document.head.appendChild(script)
  })

  return loaderPromise
}
