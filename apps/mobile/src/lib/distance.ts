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
