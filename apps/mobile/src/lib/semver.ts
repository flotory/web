/** Compare dotted app versions (e.g. 1.0.13). Returns -1, 0, or 1. */
export function compareAppVersions(left: string, right: string): number {
  const leftParts = normalizeVersion(left)
  const rightParts = normalizeVersion(right)

  const length = Math.max(leftParts.length, rightParts.length)
  for (let index = 0; index < length; index += 1) {
    const leftValue = leftParts[index] ?? 0
    const rightValue = rightParts[index] ?? 0

    if (leftValue < rightValue) {
      return -1
    }

    if (leftValue > rightValue) {
      return 1
    }
  }

  return 0
}

export function isAppVersionBelow(current: string, minimum: string | null | undefined): boolean {
  if (!minimum?.trim()) {
    return false
  }

  return compareAppVersions(current, minimum.trim()) < 0
}

function normalizeVersion(value: string): number[] {
  return value
    .trim()
    .split('.')
    .map((part) => {
      const parsed = Number.parseInt(part.replace(/[^0-9].*$/, ''), 10)
      return Number.isFinite(parsed) ? parsed : 0
    })
}
