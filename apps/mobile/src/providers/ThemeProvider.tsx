import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { mapPlatformPalette } from '../lib/applyPalette'
import { API_BASE_URL } from '../lib/config'
import { applyThemeColors, colors as defaultColors, type FlotoryThemeColors } from '../theme'

interface ThemeContextValue {
  colors: FlotoryThemeColors
  loaded: boolean
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: defaultColors,
  loaded: false,
})

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}

async function fetchPlatformPalette(): Promise<Record<string, string> | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/public/palette`, {
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      return null
    }

    const payload = (await response.json()) as { palette?: Record<string, string> }
    return payload.palette ?? null
  } catch {
    return null
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [colors, setColors] = useState<FlotoryThemeColors>(defaultColors)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const palette = await fetchPlatformPalette()
      if (cancelled) {
        return
      }

      if (palette) {
        const merged = applyThemeColors(mapPlatformPalette(palette))
        setColors(merged)
      }

      setLoaded(true)
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo(() => ({ colors, loaded }), [colors, loaded])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
