import { useCallback } from 'react'

import { fetchCardDetail } from '../lib/customerData'
import { useAuth } from '../providers/AuthProvider'
import { useScreenResource } from './useScreenResource'

export function useCardDetail(venueId?: string) {
  const { token } = useAuth()

  const load = useCallback(
    (fresh: boolean) => {
      if (!token || !venueId) return Promise.reject(new Error('missing token or venue'))
      return fetchCardDetail(token, venueId, fresh)
    },
    [token, venueId],
  )

  return useScreenResource({
    enabled: Boolean(token && venueId),
    refetchOnFocus: false,
    errorMessage: 'Could not load this loyalty card.',
    load,
  })
}
