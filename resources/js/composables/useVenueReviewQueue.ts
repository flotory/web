import { computed, ref, watch, type Ref } from 'vue'

import { api, apiErrorMessage } from '@/lib/api'
import type { VenueListingSnapshot } from '@/lib/venueListing'
import { toast } from '@/lib/toast'

export type ReviewVenue = {
  id: number
  name: string
  slug: string
  category?: string | null
  address?: string | null
  status: VenueListingSnapshot['status']
  review_note?: string | null
  submitted_at?: string | null
  published_at?: string | null
  archived?: boolean
  active_rewards_count: number
  customers_count: number
  setup_files_count: number
  final_logo_applied: boolean
  final_cover_applied: boolean
  owner?: { id: number; name: string; email: string } | null
  listing: VenueListingSnapshot
}

type ReviewMeta = {
  current_page: number
  last_page: number
  total: number
}

export function useVenueReviewQueue(statusFilter: Ref<'pending_review' | 'published' | 'draft' | 'rejected' | ''>) {
  const loading = ref(true)
  const actingId = ref<number | null>(null)
  const error = ref('')
  const venues = ref<ReviewVenue[]>([])
  const page = ref(1)
  const lastPage = ref(1)
  const total = ref(0)
  const rejectNote = ref('')
  const rejectTarget = ref<ReviewVenue | null>(null)
  const unpublishNote = ref('')
  const unpublishTarget = ref<ReviewVenue | null>(null)

  const title = computed(() => {
    if (statusFilter.value === 'pending_review') return 'Pending review'
    if (statusFilter.value === 'published') return 'Published venues'
    if (statusFilter.value === 'rejected') return 'Rejected listings'
    return 'All venue listings'
  })

  async function loadVenues() {
    loading.value = true
    error.value = ''

    try {
      const params = new URLSearchParams()
      params.set('page', String(page.value))
      if (statusFilter.value) {
        params.set('status', statusFilter.value)
      }

      const response = await api<{ venues: ReviewVenue[]; meta: ReviewMeta }>(`/admin/venues?${params}`)
      venues.value = response.venues
      page.value = response.meta.current_page
      lastPage.value = response.meta.last_page
      total.value = response.meta.total
    } catch (exception) {
      error.value = apiErrorMessage(exception, 'Could not load venues.')
    } finally {
      loading.value = false
    }
  }

  async function approveVenue(venue: ReviewVenue) {
    actingId.value = venue.id

    try {
      await api(`/admin/venues/${venue.id}/approve`, { method: 'POST' })
      toast.success(`${venue.name} is now live for customers.`)
      await loadVenues()
    } catch (exception) {
      toast.error(apiErrorMessage(exception, 'Could not approve venue.'))
    } finally {
      actingId.value = null
    }
  }

  async function rejectVenue() {
    if (!rejectTarget.value) return

    actingId.value = rejectTarget.value.id

    try {
      await api(`/admin/venues/${rejectTarget.value.id}/reject`, {
        method: 'POST',
        body: { note: rejectNote.value || undefined },
      })
      toast.success('Venue sent back to owner with feedback.')
      rejectTarget.value = null
      rejectNote.value = ''
      await loadVenues()
    } catch (exception) {
      toast.error(apiErrorMessage(exception, 'Could not reject venue.'))
    } finally {
      actingId.value = null
    }
  }

  async function unpublishVenue() {
    if (!unpublishTarget.value) return

    actingId.value = unpublishTarget.value.id

    try {
      await api(`/admin/venues/${unpublishTarget.value.id}/unpublish`, {
        method: 'POST',
        body: { note: unpublishNote.value || undefined },
      })
      toast.success(`${unpublishTarget.value.name} is hidden from customers.`)
      unpublishTarget.value = null
      unpublishNote.value = ''
      await loadVenues()
    } catch (exception) {
      toast.error(apiErrorMessage(exception, 'Could not unpublish venue.'))
    } finally {
      actingId.value = null
    }
  }

  function setStatusFilter(value: typeof statusFilter.value) {
    statusFilter.value = value
    page.value = 1
    void loadVenues()
  }

  watch(page, (next, previous) => {
    if (next !== previous) {
      void loadVenues()
    }
  })

  return {
    loading,
    actingId,
    error,
    venues,
    page,
    lastPage,
    total,
    title,
    rejectNote,
    rejectTarget,
    unpublishNote,
    unpublishTarget,
    loadVenues,
    approveVenue,
    rejectVenue,
    unpublishVenue,
    setStatusFilter,
  }
}
