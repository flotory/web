const REDEEM_PREFIX = 'flotory:redeem:'
const MEMBER_PREFIX = 'flotory:member:'
const REDEEM_PATH = '/r/'

export type ParsedLoyaltyQr =
  | { type: 'stamp'; token: string }
  | { type: 'redeem'; token: string }

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** QR payload for reward claims — never a bare UUID (those are stamp cards). */
export function buildRedeemQrValue(token: string): string {
  return `${REDEEM_PREFIX}${token.toLowerCase()}`
}

/** Universal customer stamp QR (v2) — one token per user. */
export function buildMemberQrValue(token: string): string {
  return `${MEMBER_PREFIX}${token.toLowerCase()}`
}

export function parseLoyaltyQr(raw: string): ParsedLoyaltyQr | null {
  const value = raw.trim()

  if (!value) {
    return null
  }

  const redeemMatch = value.match(/flotory:redeem:([0-9a-f-]{36})/i)

  if (redeemMatch?.[1]) {
    return { type: 'redeem', token: redeemMatch[1].toLowerCase() }
  }

  const memberMatch = value.match(/flotory:member:([0-9a-f-]{36})/i)

  if (memberMatch?.[1]) {
    return { type: 'stamp', token: memberMatch[1].toLowerCase() }
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
