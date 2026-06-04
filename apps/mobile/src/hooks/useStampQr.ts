import { useCallback } from 'react'

import { fetchStampQr } from '../lib/customerData'
import { useAuth } from '../providers/AuthProvider'
import { useScreenResource } from './useScreenResource'

interface UseStampQrOptions {
  refetchOnFocus?: boolean
}

export function useStampQr(options: UseStampQrOptions = {}) {
  const { token } = useAuth()

  const load = useCallback(
    (fresh: boolean) => {
      if (!token) return Promise.reject(new Error('missing token'))
      return fetchStampQr(token, fresh)
    },
    [token],
  )

  return useScreenResource({
    enabled: Boolean(token),
    refetchOnFocus: options.refetchOnFocus ?? false,
    errorMessage: 'Could not load your stamp QR.',
    load,
  })
}
