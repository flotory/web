import { ApiError } from '@/lib/api'

export type ScanErrorView = {
  title: string
  detail: string
  hint?: string
  requestId?: string
}

const REQUEST_SUFFIX = /\s*\(request\s+([0-9a-f-]+)\)\s*$/i

function stripLegacyRequestSuffix(message: string): { text: string; requestId?: string } {
  const match = message.match(REQUEST_SUFFIX)
  if (!match) {
    return { text: message.trim() }
  }

  return { text: message.replace(REQUEST_SUFFIX, '').trim(), requestId: match[1] }
}

function firstValidationMessage(error: ApiError): string | undefined {
  for (const messages of Object.values(error.errors)) {
    const first = messages?.find((item) => typeof item === 'string' && item.length > 0)
    if (first) {
      return first
    }
  }

  return undefined
}

function titleForDetail(detail: string, field?: string): string {
  const lower = detail.toLowerCase()

  if (lower.includes('you are at') || lower.includes('belongs to') || lower.includes('for another venue')) {
    return 'Wrong venue'
  }

  if (lower.includes('expired')) {
    return 'Code expired'
  }

  if (lower.includes('already redeemed')) {
    return 'Already redeemed'
  }

  if (field === 'redemption_token' || lower.includes('claim') || lower.includes('redeem')) {
    return 'Invalid claim code'
  }

  if (field === 'qr_token' || lower.includes('my qr') || lower.includes('loyalty card')) {
    return 'Wrong QR code'
  }

  if (field === 'scan' || lower.includes('unrecognized qr')) {
    return 'Unrecognized QR'
  }

  return 'Scan failed'
}

function hintForDetail(detail: string, lastScanKind: 'stamp' | 'redeem' | null): string | undefined {
  const lower = detail.toLowerCase()

  if (lower.includes('you are at') || lower.includes('belongs to')) {
    return 'Use the venue switcher in the left sidebar, then scan again.'
  }

  if (lower.includes('tap claim') || lower.includes('claim in rewards')) {
    return 'Customer: Rewards → tap Claim → show that QR (not the stamp card).'
  }

  if (lastScanKind === 'redeem') {
    return 'Use the claim QR from the customer Rewards screen.'
  }

  if (lower.includes('my qr')) {
    return 'Customer: open My QR in the Flotory app.'
  }

  return undefined
}

export function scanErrorView(
  error: unknown,
  options: { lastScanKind?: 'stamp' | 'redeem' | null } = {},
): ScanErrorView {
  if (!(error instanceof ApiError)) {
    return {
      title: 'Scan failed',
      detail: 'Something went wrong. Try again.',
    }
  }

  const field = Object.keys(error.errors)[0]
  const validation = firstValidationMessage(error)
  const stripped = stripLegacyRequestSuffix(validation ?? error.message)
  const detail = stripped.text || 'Something went wrong. Try again.'
  const requestId = error.requestId ?? stripped.requestId

  return {
    title: titleForDetail(detail, field),
    detail,
    hint: hintForDetail(detail, options.lastScanKind ?? null),
    requestId,
  }
}
