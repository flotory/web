const REDEEM_PREFIX = 'flotory:redeem:'
const REDEEM_PATH = '/r/'

export type ParsedLoyaltyQr =
  | { type: 'stamp'; token: string }
  | { type: 'redeem'; token: string }

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** QR payload for reward claims — never a bare UUID (those are stamp cards). */
export function buildRedeemQrValue(token: string): string {
  return `${REDEEM_PREFIX}${token.toLowerCase()}`
}

export function parseLoyaltyQr(raw: string): ParsedLoyaltyQr | null {
  const value = raw.trim()

  if (!value) {
    return null
  }

  const flotoryMatch = value.match(/flotory:redeem:([0-9a-f-]{36})/i)

  if (flotoryMatch?.[1]) {
    return { type: 'redeem', token: flotoryMatch[1].toLowerCase() }
  }

  const pathMatch = value.match(/\/r\/([0-9a-f-]{36})/i)

  if (pathMatch?.[1]) {
    return { type: 'redeem', token: pathMatch[1].toLowerCase() }
  }

  if (UUID_PATTERN.test(value)) {
    return { type: 'stamp', token: value.toLowerCase() }
  }

  return null
}
