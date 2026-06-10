/** Normalize token parsed from URLs / NFC records. */
export function normalizeNfcToken(token: string): string {
  return token.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
}

/** Parse Flotory tap URL from an NFC tag URI record → stamp token */
export function extractNfcTokenFromUri(uri: string): string | null {
  const trimmed = uri.trim()
  if (!trimmed) {
    return null
  }

  const direct = trimmed.match(/\/t\/([^/?#]+)/i)
  if (direct?.[1]) {
    const token = normalizeNfcToken(decodeURIComponent(direct[1]))
    return token || null
  }

  try {
    const url = new URL(trimmed)
    const match = url.pathname.match(/^\/t\/([^/]+)$/i)
    const token = match?.[1] ? normalizeNfcToken(decodeURIComponent(match[1])) : null
    return token || null
  } catch {
    return null
  }
}
