import { useFocusEffect } from 'expo-router'
import NetInfo from '@react-native-community/netinfo'
import { useCallback, useEffect, useRef, useState } from 'react'

type LoadMode = 'initial' | 'refresh' | 'silent'

interface UseScreenResourceOptions<T> {
  enabled?: boolean
  refetchOnFocus?: boolean
  /** Show cached data immediately on mount, then refresh in the background */
  hydrate?: () => T | null
  errorMessage: string
  load: (fresh: boolean) => Promise<T>
}

export function useScreenResource<T>({
  enabled = true,
  refetchOnFocus = false,
  hydrate,
  errorMessage,
  load,
}: UseScreenResourceOptions<T>) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const loadRef = useRef(load)

  useEffect(() => {
    loadRef.current = load
  }, [load])

  const run = useCallback(
    async (fresh: boolean, mode: LoadMode) => {
      if (!enabled) return

      if (mode === 'refresh') setRefreshing(true)
      if (mode === 'initial') setLoading(true)

      try {
        const result = await loadRef.current(fresh)
        setData(result)
        setError('')
      } catch {
        if (mode !== 'silent') {
          const network = await NetInfo.fetch()
          setError(network.isConnected === false ? 'You appear to be offline. Reconnect and try again.' : errorMessage)
        }
      } finally {
        if (mode === 'refresh') setRefreshing(false)
        if (mode === 'initial') setLoading(false)
      }
    },
    [enabled, errorMessage],
  )

  const hydrateRef = useRef(hydrate)
  useEffect(() => {
    hydrateRef.current = hydrate
  }, [hydrate])

  useEffect(() => {
    if (!enabled) {
      setData(null)
      setLoading(false)
      setError('')
      return
    }

    const seeded = hydrateRef.current?.() ?? null
    if (seeded) {
      setData(seeded)
      setLoading(false)
      setError('')
      void run(true, 'silent')
      return
    }

    void run(false, 'initial')
  }, [enabled, run])

  useFocusEffect(
    useCallback(() => {
      if (!refetchOnFocus || loading) return
      void run(true, 'silent')
    }, [loading, refetchOnFocus, run]),
  )

  const refresh = useCallback(() => run(true, 'refresh'), [run])
  const silentRefresh = useCallback(() => run(true, 'silent'), [run])
  const reload = useCallback(() => run(true, 'initial'), [run])

  return {
    data,
    loading,
    refreshing,
    error,
    refresh,
    silentRefresh,
    reload,
  }
}
