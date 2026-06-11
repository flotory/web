/** Tracks stamp events the user has already seen and per-card stamp baselines for polling. */

const acknowledgedSignatures = new Set<string>()
const stampBaselines = new Map<number, number>()

export function acknowledgeStampSignature(signature: string): void {
  acknowledgedSignatures.add(signature)
}

export function isStampSignatureAcknowledged(signature: string): boolean {
  return acknowledgedSignatures.has(signature)
}

export function clearStampAckState(): void {
  acknowledgedSignatures.clear()
  stampBaselines.clear()
}

export function syncStampBaseline(cardId: number, stamps: number): void {
  stampBaselines.set(cardId, stamps)
}

export function getStampBaseline(cardId: number): number | undefined {
  return stampBaselines.get(cardId)
}

/** Apply known stamp counts before polling compares against a stale baseline. */
export function applyStampBaselines(baseline: Map<number, number>, cards: { id: number; stamps: number }[]): void {
  for (const card of cards) {
    const synced = stampBaselines.get(card.id)
    if (synced === undefined) {
      continue
    }

    const current = baseline.get(card.id)
    if (current === undefined || synced > current) {
      baseline.set(card.id, synced)
    }
  }
}
