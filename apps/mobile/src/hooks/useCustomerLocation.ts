import * as Location from 'expo-location'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, Linking, Platform } from 'react-native'

export type CustomerLocationStatus = 'idle' | 'loading' | 'granted' | 'denied' | 'unavailable'

export interface CustomerCoordinates {
  latitude: number
  longitude: number
}

interface UseCustomerLocationOptions {
  /** Prompt the OS location dialog when permission has not been decided yet. */
  autoRequest?: boolean
}

export function useCustomerLocation(options: UseCustomerLocationOptions = {}) {
  const autoRequest = options.autoRequest ?? false
  const autoRequestedRef = useRef(false)
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
      if (permission.status !== Location.PermissionStatus.GRANTED) {
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
      if (permission.status !== Location.PermissionStatus.GRANTED) {
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

  const openLocationSettings = useCallback(async () => {
    if (Platform.OS === 'ios') {
      await Linking.openURL('app-settings:')
      return
    }

    await Linking.openSettings()
  }, [])

  const syncPermission = useCallback(async () => {
    try {
      const permission = await Location.getForegroundPermissionsAsync()

      if (permission.status === Location.PermissionStatus.GRANTED) {
        setStatus('loading')
        await readPosition()
        return
      }

      if (permission.status === Location.PermissionStatus.DENIED) {
        setCoords(null)
        setStatus('denied')
        return
      }

      setCoords(null)
      setStatus('idle')

      if (autoRequest && !autoRequestedRef.current) {
        autoRequestedRef.current = true
        await requestLocation()
      }
    } catch {
      setCoords(null)
      setStatus('unavailable')
    }
  }, [autoRequest, readPosition, requestLocation])

  useEffect(() => {
    void syncPermission()
  }, [syncPermission])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void syncPermission()
      }
    })

    return () => subscription.remove()
  }, [syncPermission])

  return {
    status,
    coords,
    hasLocation: coords !== null,
    requestLocation,
    refreshLocation,
    openLocationSettings,
  }
}
