import { useCallback } from 'react'

import { fetchCardDetail, readCachedCardDetail } from '../lib/customerData'
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

  const hydrate = useCallback(() => {
    if (!token || !venueId) return null
    return readCachedCardDetail(token, venueId)
  }, [token, venueId])

  return useScreenResource({
    enabled: Boolean(token && venueId),
    refetchOnFocus: false,
    hydrate,
    errorMessage: 'Could not load this loyalty card.',
    load,
  })
}
