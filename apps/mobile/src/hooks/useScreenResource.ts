import { useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'

type LoadMode = 'initial' | 'refresh' | 'silent'

interface UseScreenResourceOptions<T> {
  enabled?: boolean
  refetchOnFocus?: boolean
  errorMessage: string
  load: (fresh: boolean) => Promise<T>
}

export function useScreenResource<T>({
  enabled = true,
  refetchOnFocus = false,
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
        if (mode !== 'silent') setError(errorMessage)
      } finally {
        if (mode === 'refresh') setRefreshing(false)
        if (mode === 'initial') setLoading(false)
      }
    },
    [enabled, errorMessage],
  )

  useEffect(() => {
    void run(false, 'initial')
  }, [run])

  useFocusEffect(
    useCallback(() => {
      if (!refetchOnFocus || loading) return
      void run(true, 'silent')
    }, [loading, refetchOnFocus, run]),
  )

  const refresh = useCallback(() => run(true, 'refresh'), [run])
  const reload = useCallback(() => run(true, 'initial'), [run])

  return {
    data,
    loading,
    refreshing,
    error,
    refresh,
    reload,
  }
}
