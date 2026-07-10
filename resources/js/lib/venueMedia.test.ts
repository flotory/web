import { describe, expect, it } from 'vitest'

import {
  venueCoverThumbUrl,
  venueCoverUrl,
  venueHasCustomCover,
  venueHasCustomLogo,
  venueLogoThumbUrl,
  venueLogoUrl,
} from './venueMedia'

const venue = {
  name: 'Demo Cafe',
  category: 'cafe' as const,
  logo: '/uploads/owners/1/brands/12/logos/custom.png',
  logo_thumb: '/uploads/owners/1/brands/12/logos/custom-thumb.png',
  cover_image: '/uploads/owners/1/brands/12/covers/cover.jpg',
  cover_image_thumb: '/uploads/owners/1/brands/12/covers/cover-thumb.jpg',
}

describe('venueMedia', () => {
  it('prefers thumb paths for thumb helpers and full paths for full helpers', () => {
    expect(venueLogoThumbUrl(venue)).toBe('/uploads/owners/1/brands/12/logos/custom-thumb.png')
    expect(venueLogoUrl(venue)).toBe('/uploads/owners/1/brands/12/logos/custom.png')
    expect(venueCoverThumbUrl(venue)).toBe('/uploads/owners/1/brands/12/covers/cover-thumb.jpg')
    expect(venueCoverUrl(venue)).toBe('/uploads/owners/1/brands/12/covers/cover.jpg')
  })

  it('falls back to category defaults when uploads are missing', () => {
    const bare = { name: 'Harbor', category: 'cafe' as const }

    expect(venueLogoThumbUrl(bare)).toMatch(/^\/images\/defaults\//)
    expect(venueCoverThumbUrl(bare)).toMatch(/^\/images\/defaults\//)
  })

  it('falls back to setup logo preview when brand logo is not applied yet', () => {
    const venue = {
      name: 'N Spa',
      category: 'spa' as const,
      setup_logo_preview: '/uploads/owners/1/brands/12/setup/logo.png',
    }

    expect(venueLogoThumbUrl(venue)).toBe('/uploads/owners/1/brands/12/setup/logo.png')
    expect(venueHasCustomLogo(venue)).toBe(true)
  })

  it('prefers applied brand logo over setup logo preview', () => {
    const venue = {
      name: 'N Spa',
      category: 'spa' as const,
      logo_thumb: '/uploads/owners/1/brands/12/logos/final-thumb.jpg',
      setup_logo_preview: '/uploads/owners/1/brands/12/setup/logo.png',
    }

    expect(venueLogoThumbUrl(venue)).toBe('/uploads/owners/1/brands/12/logos/final-thumb.jpg')
  })

  it('detects custom logo and cover uploads', () => {
    expect(venueHasCustomLogo(venue)).toBe(true)
    expect(venueHasCustomCover(venue)).toBe(true)
    expect(venueHasCustomLogo({ name: 'X', category: 'cafe' })).toBe(false)
  })
})
