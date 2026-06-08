import { describe, expect, it } from 'vitest'

import { listingItemPath, listingStatusLabel, listingStatusTone } from './venueListing'

describe('listingStatusLabel', () => {
  it('labels published venues for customers', () => {
    expect(listingStatusLabel('published')).toBe('Live for customers')
  })

  it('defaults unknown or missing status to setup in progress', () => {
    expect(listingStatusLabel(null)).toBe('Setup in progress')
    expect(listingStatusLabel(undefined)).toBe('Setup in progress')
  })
})

describe('listingStatusTone', () => {
  it('maps review states to badge tones', () => {
    expect(listingStatusTone('pending_review')).toBe('amber')
    expect(listingStatusTone('rejected')).toBe('blue')
  })
})

describe('listingItemPath', () => {
  it('routes checklist items to the right owner pages', () => {
    expect(listingItemPath(12, 'rewards')).toBe('/rewards')
    expect(listingItemPath(12, 'setup_files')).toBe('/my-venues/12/setup-files')
    expect(listingItemPath(12, 'address')).toBe('/my-venues/12/settings')
  })
})
