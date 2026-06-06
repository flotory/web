import * as Location from 'expo-location'
import { useCallback, useEffect, useState } from 'react'

export type CustomerLocationStatus = 'idle' | 'loading' | 'granted' | 'denied' | 'unavailable'

export interface CustomerCoordinates {
  latitude: number
  longitude: number
}

export function useCustomerLocation() {
  const [status, setStatus] = useState<CustomerLocationStatus>('idle')
  const [coords, setCoords] = useState<CustomerCoordinates | null>(null)

  const readPosition = useCallback(async () => {
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    })

    setCoords({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    })
    setStatus('granted')
  }, [])

  const requestLocation = useCallback(async () => {
    setStatus('loading')

    try {
      const permission = await Location.requestForegroundPermissionsAsync()
      if (permission.status !== 'granted') {
        setCoords(null)
        setStatus('denied')
        return
      }

      await readPosition()
    } catch {
      setCoords(null)
      setStatus('unavailable')
    }
  }, [readPosition])

  const refreshLocation = useCallback(async () => {
    setStatus('loading')

    try {
      const permission = await Location.getForegroundPermissionsAsync()
      if (permission.status !== 'granted') {
        setCoords(null)
        setStatus('denied')
        return
      }

      await readPosition()
    } catch {
      setCoords(null)
      setStatus('unavailable')
    }
  }, [readPosition])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const permission = await Location.getForegroundPermissionsAsync()
        if (cancelled) {
          return
        }

        if (permission.status === 'granted') {
          setStatus('loading')
          await readPosition()
          return
        }

        if (permission.status === 'denied') {
          setStatus('denied')
        }
      } catch {
        if (!cancelled) {
          setStatus('unavailable')
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [readPosition])

  return {
    status,
    coords,
    hasLocation: coords !== null,
    requestLocation,
    refreshLocation,
  }
}
