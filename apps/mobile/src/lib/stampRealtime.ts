import { isStampSignatureAcknowledged } from './stampAck'
import { stampUpdateSignature } from './stampLiveUpdate'
import type { StampAddedPayload } from '../types/realtime'

export type StampPublishSkipReason = 'duplicate-signature' | 'acknowledged'

export type StampPublishDecision =
  | { publish: true; signature: string }
  | { publish: false; reason: StampPublishSkipReason }

export function decideStampPublish(
  payload: StampAddedPayload,
  lastSignature: string,
): StampPublishDecision {
  const signature = stampUpdateSignature(payload)

  if (lastSignature === signature) {
    return { publish: false, reason: 'duplicate-signature' }
  }

  if (isStampSignatureAcknowledged(signature)) {
    return { publish: false, reason: 'acknowledged' }
  }

  return { publish: true, signature }
}
