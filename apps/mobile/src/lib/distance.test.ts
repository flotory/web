import { describe, expect, it } from 'vitest'

import type { TFunction } from 'i18next'
import {
  collectDiscoverVenueLocations,
  nearestDiscoverVenueLocation,
  sortDiscoverVenuesByNearestLocation,
} from './distance'

const t = ((k: string) => k) as unknown as TFunction

describe('discover venue distance', () => {
  const customer = { latitude: 41.708, longitude: 44.768 }

  const chainVenue = {
    name: 'Mio Gelato',
    slug: 'mio-gelato',
    address: 'Airport Road 1, Tbilisi',
    latitude: 41.6692,
    longitude: 44.9547,
    branches: [
      {
        name: 'Mio Gelato · Vake',
        slug: 'mio-gelato-vake',
        address: '14 Vake Park, Tbilisi',
        latitude: 41.7075,
        longitude: 44.7661,
      },
      {
        name: 'Mio Gelato · Rustaveli',
        slug: 'mio-gelato-rustaveli',
        address: '10 Rustaveli Ave, Tbilisi',
        latitude: 41.6977,
        longitude: 44.8015,
      },
    ],
  }

  it('collects brand and branch coordinates', () => {
    expect(collectDiscoverVenueLocations(chainVenue)).toHaveLength(3)
  })

  it('picks the nearest branch to the customer', () => {
    const nearest = nearestDiscoverVenueLocation(customer, chainVenue)

    expect(nearest?.location.name).toBe('Mio Gelato · Vake')
    expect(nearest?.distanceKm).toBeGreaterThan(0)
  })

  it('sorts chains by nearest branch distance', () => {
    const venues = [
      chainVenue,
      {
        name: 'Far Cafe',
        slug: 'far-cafe',
        address: 'Remote Road',
        latitude: 42.5,
        longitude: 45.0,
        branches: [],
      },
    ]

    const sorted = sortDiscoverVenuesByNearestLocation(venues, customer, t)

    expect(sorted[0]?.name).toBe('Mio Gelato')
    expect(sorted[0]?.nearestLocationName).toBe('Mio Gelato · Vake')
    expect(sorted[0]?.distanceLabel).toMatch(/^distance\.(meters|km)Away$/)
    expect(sorted[1]?.name).toBe('Far Cafe')
  })
})
