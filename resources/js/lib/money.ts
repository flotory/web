export function parseMoneyAmount(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const amount = Number(value)
  return Number.isFinite(amount) && amount >= 0 ? amount : null
}

export function moneyAmountsEqual(left: unknown, right: unknown): boolean {
  const parsedLeft = parseMoneyAmount(left)
  const parsedRight = parseMoneyAmount(right)

  if (parsedLeft === null || parsedRight === null) {
    return parsedLeft === parsedRight
  }

  return Math.abs(parsedLeft - parsedRight) < 0.001
}
