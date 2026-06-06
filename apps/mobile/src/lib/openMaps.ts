import { Linking, Platform } from 'react-native'

export interface VenueMapTarget {
  latitude?: number | null
  longitude?: number | null
  address?: string | null
  label?: string | null
}

async function tryOpenUrl(url: string): Promise<boolean> {
  try {
    const supported = await Linking.canOpenURL(url)
    if (!supported) {
      return false
    }

    await Linking.openURL(url)
    return true
  } catch {
    return false
  }
}

export function hasVenueMapTarget(target: VenueMapTarget): boolean {
  const hasCoords = typeof target.latitude === 'number'
    && Number.isFinite(target.latitude)
    && typeof target.longitude === 'number'
    && Number.isFinite(target.longitude)

  return hasCoords || Boolean(target.address?.trim())
}

/** Opens the native maps app. Uses coordinates when available; no paid Maps API. */
export async function openVenueInMaps(target: VenueMapTarget): Promise<boolean> {
  const label = encodeURIComponent(target.label?.trim() || 'Venue')

  if (
    typeof target.latitude === 'number'
    && Number.isFinite(target.latitude)
    && typeof target.longitude === 'number'
    && Number.isFinite(target.longitude)
  ) {
    const lat = target.latitude
    const lng = target.longitude

    const candidates = Platform.select({
      ios: [
        `http://maps.apple.com/?daddr=${lat},${lng}&q=${label}`,
        `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
      ],
      android: [
        `geo:${lat},${lng}?q=${lat},${lng}(${label})`,
        `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
      ],
      default: [`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`],
    }) ?? [`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`]

    for (const url of candidates) {
      if (await tryOpenUrl(url)) {
        return true
      }
    }
  }

  const address = target.address?.trim()
  if (address) {
    const query = encodeURIComponent(address)
    return tryOpenUrl(`https://www.google.com/maps/search/?api=1&query=${query}`)
  }

  return false
}
