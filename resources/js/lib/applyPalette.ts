export type FlotoryPalette = Record<string, string>

export function paletteCssVarName(key: string): string {
  return `--flotory-${key.replace(/_/g, '-')}`
}

export function applyPaletteToDocument(palette: FlotoryPalette, target: HTMLElement = document.documentElement): void {
  for (const [key, value] of Object.entries(palette)) {
    target.style.setProperty(paletteCssVarName(key), value)
  }
}

export async function loadAndApplyPlatformPalette(): Promise<FlotoryPalette | null> {
  try {
    const response = await fetch('/api/public/palette', {
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      return null
    }

    const payload = await response.json() as { palette?: FlotoryPalette }
    if (!payload.palette) {
      return null
    }

    applyPaletteToDocument(payload.palette)
    return payload.palette
  } catch {
    return null
  }
}
