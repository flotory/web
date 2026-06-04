import { describe, expect, it } from 'vitest'

import { buildMemberQrValue, buildRedeemQrValue, parseLoyaltyQr } from './loyaltyQr'

const token = '550e8400-e29b-41d4-a716-446655440000'

describe('loyaltyQr', () => {
  it('parses universal member stamp payload', () => {
    const payload = buildMemberQrValue(token)

    expect(payload).toBe(`flotory:member:${token}`)
    expect(parseLoyaltyQr(payload)).toEqual({ type: 'stamp', token })
  })

  it('does not treat member payload as redeem', () => {
    expect(parseLoyaltyQr(buildMemberQrValue(token))?.type).toBe('stamp')
    expect(parseLoyaltyQr(buildRedeemQrValue(token))?.type).toBe('redeem')
  })
})
