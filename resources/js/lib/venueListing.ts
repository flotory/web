export type VenueListingStatus = 'draft' | 'pending_review' | 'published' | 'rejected'

export interface VenueListingItem {
  key: string
  label: string
  complete: boolean
  hint: string
}

export interface VenueListingSnapshot {
  status: VenueListingStatus
  review_note?: string | null
  submitted_at?: string | null
  published_at?: string | null
  ready_to_submit: boolean
  can_submit: boolean
  is_public: boolean
  items: VenueListingItem[]
}

export function listingStatusLabel(status: VenueListingStatus | null | undefined): string {
  switch (status) {
    case 'published':
      return 'Live for customers'
    case 'pending_review':
      return 'Awaiting approval'
    case 'rejected':
      return 'Needs updates'
    default:
      return 'Setup in progress'
  }
}

export function listingStatusTone(status: VenueListingStatus | null | undefined): 'green' | 'amber' | 'blue' | 'slate' {
  switch (status) {
    case 'published':
      return 'green'
    case 'pending_review':
      return 'amber'
    case 'rejected':
      return 'blue'
    default:
      return 'slate'
  }
}

export function listingItemPath(venueId: number, key: string): string {
  if (key === 'rewards') {
    return '/rewards'
  }

  if (key === 'setup_files' || key === 'logo_source' || key === 'supporting_files') {
    return `/my-venues/${venueId}/setup-files`
  }

  if (key === 'address' || key === 'category') {
    return `/my-venues/${venueId}/settings`
  }

  return `/my-venues/${venueId}/settings`
}
