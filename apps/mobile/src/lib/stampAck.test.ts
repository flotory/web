import { describe, expect, it, beforeEach } from 'vitest'

import {
  acknowledgeStampSignature,
  applyStampBaselines,
  clearStampAckState,
  getStampBaseline,
  isStampSignatureAcknowledged,
  syncStampBaseline,
} from './stampAck'

describe('stampAck', () => {
  beforeEach(() => {
    clearStampAckState()
  })

  it('tracks acknowledged signatures', () => {
    acknowledgeStampSignature('42:3:4:1:false')
    expect(isStampSignatureAcknowledged('42:3:4:1:false')).toBe(true)
    expect(isStampSignatureAcknowledged('other')).toBe(false)
  })

  it('stores per-card stamp baselines', () => {
    syncStampBaseline(42, 7)
    expect(getStampBaseline(42)).toBe(7)
    expect(getStampBaseline(99)).toBeUndefined()
  })

  it('raises stale polling baselines to the synced realtime count', () => {
    syncStampBaseline(42, 8)
    const baseline = new Map<number, number>([[42, 5], [99, 2]])

    applyStampBaselines(baseline, [{ id: 42, stamps: 8 }, { id: 99, stamps: 2 }])

    expect(baseline.get(42)).toBe(8)
    expect(baseline.get(99)).toBe(2)
  })

  it('does not lower a baseline that is already ahead', () => {
    syncStampBaseline(42, 6)
    const baseline = new Map<number, number>([[42, 9]])

    applyStampBaselines(baseline, [{ id: 42, stamps: 9 }])

    expect(baseline.get(42)).toBe(9)
  })

  it('clears acknowledgements and baselines together', () => {
    acknowledgeStampSignature('sig')
    syncStampBaseline(1, 3)
    clearStampAckState()

    expect(isStampSignatureAcknowledged('sig')).toBe(false)
    expect(getStampBaseline(1)).toBeUndefined()
  })
})
