import { describe, expect, it } from 'vitest'

import { acknowledgeStampSignature, clearStampAckState } from './stampAck'
import { decideStampPublish } from './stampRealtime'
import type { StampAddedPayload } from '../types/realtime'

function stampPayload(overrides: Partial<StampAddedPayload> = {}): StampAddedPayload {
  return {
    customer: { id: 42, venue_id: 10, stamps: 4, venue: { id: 10, name: 'Demo Cafe', slug: 'demo-cafe' } },
    venue: { id: 10, name: 'Demo Cafe', slug: 'demo-cafe' },
    previous_stamps: 3,
    added_stamps: 1,
    stamps: 4,
    next_reward: null,
    available_rewards: [],
    milestones: [],
    current_cycle: 1,
    cycle_completed: false,
    message: '+1 stamp added',
    occurred_at: '2026-06-04T19:00:00.000Z',
    ...overrides,
  }
}

describe('decideStampPublish', () => {
  it('publishes a new stamp signature', () => {
    const decision = decideStampPublish(stampPayload(), '')

    expect(decision).toEqual({ publish: true, signature: '42:1:3:4:1:false' })
  })

  it('skips duplicate signatures from polling', () => {
    const payload = stampPayload()
    const first = decideStampPublish(payload, '')
    expect(first.publish).toBe(true)
    if (!first.publish) {
      throw new Error('expected publish')
    }

    const duplicate = decideStampPublish(payload, first.signature)
    expect(duplicate).toEqual({ publish: false, reason: 'duplicate-signature' })
  })

  it('skips signatures the user already acknowledged locally', () => {
    clearStampAckState()
    acknowledgeStampSignature('42:1:3:4:1:false')

    expect(decideStampPublish(stampPayload(), '')).toEqual({
      publish: false,
      reason: 'acknowledged',
    })
  })
})
