export interface Coordinates {
  latitude: number
  longitude: number
}

export interface VenueCoordinates {
  latitude?: number | null
  longitude?: number | null
}

const EARTH_RADIUS_KM = 6371

function toRadians(value: number): number {
  return (value * Math.PI) / 180
}

export function hasVenueCoordinates(venue: VenueCoordinates): venue is Required<Coordinates> {
  return typeof venue.latitude === 'number'
    && Number.isFinite(venue.latitude)
    && typeof venue.longitude === 'number'
    && Number.isFinite(venue.longitude)
}

/** Straight-line distance in kilometers (Haversine). */
export function haversineDistanceKm(from: Coordinates, to: Coordinates): number {
  const latDelta = toRadians(to.latitude - from.latitude)
  const lngDelta = toRadians(to.longitude - from.longitude)
  const fromLat = toRadians(from.latitude)
  const toLat = toRadians(to.latitude)

  const a = Math.sin(latDelta / 2) ** 2
    + Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lngDelta / 2) ** 2

  return EARTH_RADIUS_KM * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

export function formatDistanceKm(distanceKm: number): string {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) {
    return ''
  }

  if (distanceKm < 1) {
    return `${Math.max(1, Math.round(distanceKm * 1000))} m away`
  }

  if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)} km away`
  }

  return `${Math.round(distanceKm)} km away`
}

export function distanceLabelForVenue(customer: Coordinates, venue: VenueCoordinates): string | null {
  if (!hasVenueCoordinates(venue)) {
    return null
  }

  return formatDistanceKm(haversineDistanceKm(customer, venue))
}

export interface DiscoverVenueLocation {
  latitude: number
  longitude: number
  address?: string | null
  name?: string | null
  slug?: string | null
}

export interface DiscoverVenueLike {
  name: string
  slug: string
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  branches?: Array<{
    name: string
    slug: string
    address?: string | null
    latitude?: number | null
    longitude?: number | null
  }> | null
}

export function collectDiscoverVenueLocations(venue: DiscoverVenueLike): DiscoverVenueLocation[] {
  const locations: DiscoverVenueLocation[] = []

  if (hasVenueCoordinates(venue)) {
    locations.push({
      latitude: venue.latitude,
      longitude: venue.longitude,
      address: venue.address ?? null,
      name: venue.name,
      slug: venue.slug,
    })
  }

  for (const branch of venue.branches ?? []) {
    if (!hasVenueCoordinates(branch)) {
      continue
    }

    locations.push({
      latitude: branch.latitude,
      longitude: branch.longitude,
      address: branch.address ?? null,
      name: branch.name,
      slug: branch.slug,
    })
  }

  return locations
}

export function nearestDiscoverVenueLocation(
  customer: Coordinates,
  venue: DiscoverVenueLike,
): { location: DiscoverVenueLocation; distanceKm: number } | null {
  const locations = collectDiscoverVenueLocations(venue)

  if (locations.length === 0) {
    return null
  }

  let nearest = locations[0]
  let minKm = haversineDistanceKm(customer, nearest)

  for (let index = 1; index < locations.length; index += 1) {
    const candidate = locations[index]
    const distanceKm = haversineDistanceKm(customer, candidate)

    if (distanceKm < minKm) {
      minKm = distanceKm
      nearest = candidate
    }
  }

  return { location: nearest, distanceKm: minKm }
}

export type DiscoverVenueDistanceFields = {
  distanceKm: number | null
  distanceLabel: string | null
  nearestAddress: string | null
  nearestLocationName: string | null
  nearestLatitude: number | null
  nearestLongitude: number | null
}

export function sortDiscoverVenuesByNearestLocation<T extends DiscoverVenueLike & { name: string }>(
  venues: T[],
  customer: Coordinates | null,
): Array<T & DiscoverVenueDistanceFields> {
  const enriched = venues.map((venue) => {
    if (!customer) {
      const fallback = collectDiscoverVenueLocations(venue)[0]

      return {
        ...venue,
        distanceKm: null,
        distanceLabel: null,
        nearestAddress: fallback?.address ?? venue.address ?? null,
        nearestLocationName: fallback?.name ?? venue.name,
        nearestLatitude: fallback?.latitude ?? venue.latitude ?? null,
        nearestLongitude: fallback?.longitude ?? venue.longitude ?? null,
      }
    }

    const nearest = nearestDiscoverVenueLocation(customer, venue)

    if (!nearest) {
      return {
        ...venue,
        distanceKm: null,
        distanceLabel: null,
        nearestAddress: venue.address ?? null,
        nearestLocationName: venue.name,
        nearestLatitude: venue.latitude ?? null,
        nearestLongitude: venue.longitude ?? null,
      }
    }

    return {
      ...venue,
      distanceKm: nearest.distanceKm,
      distanceLabel: formatDistanceKm(nearest.distanceKm),
      nearestAddress: nearest.location.address ?? venue.address ?? null,
      nearestLocationName: nearest.location.name ?? venue.name,
      nearestLatitude: nearest.location.latitude,
      nearestLongitude: nearest.location.longitude,
    }
  })

  if (!customer) {
    return enriched
  }

  return [...enriched].sort((left, right) => {
    if (left.distanceKm === null && right.distanceKm === null) {
      return left.name.localeCompare(right.name)
    }

    if (left.distanceKm === null) {
      return 1
    }

    if (right.distanceKm === null) {
      return -1
    }

    if (left.distanceKm === right.distanceKm) {
      return left.name.localeCompare(right.name)
    }

    return left.distanceKm - right.distanceKm
  })
}

export function sortVenuesByDistance<T extends VenueCoordinates & { name: string }>(
  venues: T[],
  customer: Coordinates | null,
): Array<T & { distanceKm: number | null; distanceLabel: string | null }> {
  const enriched = venues.map((venue) => {
    if (!customer || !hasVenueCoordinates(venue)) {
      return {
        ...venue,
        distanceKm: null,
        distanceLabel: null,
      }
    }

    const distanceKm = haversineDistanceKm(customer, venue)

    return {
      ...venue,
      distanceKm,
      distanceLabel: formatDistanceKm(distanceKm),
    }
  })

  if (!customer) {
    return enriched
  }

  return [...enriched].sort((left, right) => {
    if (left.distanceKm === null && right.distanceKm === null) {
      return left.name.localeCompare(right.name)
    }

    if (left.distanceKm === null) {
      return 1
    }

    if (right.distanceKm === null) {
      return -1
    }

    if (left.distanceKm === right.distanceKm) {
      return left.name.localeCompare(right.name)
    }

    return left.distanceKm - right.distanceKm
  })
}
