import { describe, expect, it } from 'vitest'

import { moneyAmountsEqual, parseMoneyAmount } from './money'

describe('parseMoneyAmount', () => {
  it('accepts valid non-negative numbers', () => {
    expect(parseMoneyAmount('12.50')).toBe(12.5)
    expect(parseMoneyAmount(0)).toBe(0)
  })

  it('rejects invalid values', () => {
    expect(parseMoneyAmount('')).toBeNull()
    expect(parseMoneyAmount(null)).toBeNull()
    expect(parseMoneyAmount(-1)).toBeNull()
    expect(parseMoneyAmount('abc')).toBeNull()
  })
})

describe('moneyAmountsEqual', () => {
  it('compares parsed amounts within tolerance', () => {
    expect(moneyAmountsEqual('10.001', '10.0005')).toBe(true)
    expect(moneyAmountsEqual('10', '10.01')).toBe(false)
  })

  it('treats two nulls as equal', () => {
    expect(moneyAmountsEqual('', null)).toBe(true)
  })
})
