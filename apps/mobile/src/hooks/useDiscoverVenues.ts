import { useCallback } from 'react'

import { fetchDiscoverVenues } from '../lib/customerData'
import { useAuth } from '../providers/AuthProvider'
import { useScreenResource } from './useScreenResource'

export function useDiscoverVenues() {
  const { token } = useAuth()

  const load = useCallback(
    (fresh: boolean) => fetchDiscoverVenues(token, fresh),
    [token],
  )

  return useScreenResource({
    enabled: true,
    refetchOnFocus: true,
    errorMessage: 'Could not load venues.',
    load,
  })
}
