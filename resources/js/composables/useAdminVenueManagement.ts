import { computed, ref, watch, type Ref } from 'vue'

import { api, apiErrorMessage } from '@/lib/api'
import type { VenueListingSnapshot } from '@/lib/venueListing'
import type { Venue } from '@/types'

export type AdminManageVenue = Venue & {
  active_rewards_count: number
  rewards_count?: number
  is_branch?: boolean
  location_status?: string | null
  owner?: { id: number; name: string; email: string } | null
  listing: VenueListingSnapshot
}

type ManageMeta = {
  current_page: number
  last_page: number
  total: number
}

export function useAdminVenueManagement(options?: {
  search?: Ref<string>
  statusFilter?: Ref<string>
  includeArchived?: Ref<boolean>
}) {
  const loading = ref(true)
  const error = ref('')
  const venues = ref<AdminManageVenue[]>([])
  const page = ref(1)
  const lastPage = ref(1)
  const total = ref(0)

  const title = computed(() => 'All venues on the platform')

  async function loadVenues() {
    loading.value = true
    error.value = ''

    try {
      const params = new URLSearchParams()
      params.set('page', String(page.value))

      const search = options?.search?.value.trim()
      if (search) {
        params.set('search', search)
      }

      const status = options?.statusFilter?.value
      if (status) {
        params.set('status', status)
      }

      if (options?.includeArchived?.value) {
        params.set('include_archived', '1')
      }

      const response = await api<{ venues: AdminManageVenue[]; meta: ManageMeta }>(
        `/admin/manage-venues?${params}`,
      )
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

  async function loadVenue(id: number) {
    return api<{ venue: AdminManageVenue }>(`/admin/manage-venues/${id}`)
  }

  watch(page, (next, previous) => {
    if (next !== previous) {
      void loadVenues()
    }
  })

  if (options?.search) {
    watch(options.search, () => {
      page.value = 1
      void loadVenues()
    })
  }

  if (options?.statusFilter) {
    watch(options.statusFilter, () => {
      page.value = 1
      void loadVenues()
    })
  }

  if (options?.includeArchived) {
    watch(options.includeArchived, () => {
      page.value = 1
      void loadVenues()
    })
  }

  return {
    loading,
    error,
    venues,
    page,
    lastPage,
    total,
    title,
    loadVenues,
    loadVenue,
  }
}
