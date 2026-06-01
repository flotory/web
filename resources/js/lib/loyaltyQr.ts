const REDEEM_PATH = '/r/'

export type ParsedLoyaltyQr =
  | { type: 'stamp'; token: string }
  | { type: 'redeem'; token: string }

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function buildRedeemQrValue(token: string, origin = window.location.origin): string {
  return `${origin.replace(/\/$/, '')}${REDEEM_PATH}${token}`
}

export function parseLoyaltyQr(raw: string): ParsedLoyaltyQr | null {
  const value = raw.trim()

  if (!value) {
    return null
  }

  try {
    if (value.includes('://')) {
      const url = new URL(value)
      const match = url.pathname.match(/^\/r\/([0-9a-f-]{36})$/i)

      if (match?.[1]) {
        return { type: 'redeem', token: match[1].toLowerCase() }
      }
    }
  } catch {
    // Not a URL — fall through.
  }

  const flotoryMatch = value.match(/^flotory:redeem:([0-9a-f-]{36})$/i)

  if (flotoryMatch?.[1]) {
    return { type: 'redeem', token: flotoryMatch[1].toLowerCase() }
  }

  if (value.startsWith(REDEEM_PATH)) {
    const token = value.slice(REDEEM_PATH.length)

    if (UUID_PATTERN.test(token)) {
      return { type: 'redeem', token: token.toLowerCase() }
    }
  }

  if (UUID_PATTERN.test(value)) {
    return { type: 'stamp', token: value.toLowerCase() }
  }

  return null
}
