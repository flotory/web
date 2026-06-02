import { useCallback } from 'react'

import { fetchCustomerCards } from '../lib/customerData'
import { useAuth } from '../providers/AuthProvider'
import { useScreenResource } from './useScreenResource'

interface UseCustomerCardsOptions {
  refetchOnFocus?: boolean
}

export function useCustomerCards(options: UseCustomerCardsOptions = {}) {
  const { token } = useAuth()

  const load = useCallback(
    (fresh: boolean) => {
      if (!token) return Promise.reject(new Error('missing token'))
      return fetchCustomerCards(token, fresh)
    },
    [token],
  )

  return useScreenResource({
    enabled: Boolean(token),
    refetchOnFocus: options.refetchOnFocus ?? false,
    errorMessage: 'Could not load your wallet.',
    load,
  })
}
