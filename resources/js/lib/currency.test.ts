import { describe, expect, it } from 'vitest'

import { formatCurrency, currencySymbol, resolveCurrency } from '@/lib/currency'
import { moneyAmountsEqual, parseMoneyAmount } from '@/lib/money'

describe('currency helpers', () => {
  it('resolves supported currencies with AMD default', () => {
    expect(resolveCurrency('USD')).toBe('USD')
    expect(resolveCurrency('EUR')).toBe('AMD')
  })

  it('formats USD and AMD amounts', () => {
    expect(formatCurrency(4, 'USD', 'en')).toContain('4')
    expect(currencySymbol('AMD')).toBe('֏')
    expect(formatCurrency(1600, 'AMD', 'hy')).toContain('1')
  })
})

describe('money helpers', () => {
  it('parses numeric strings and numbers', () => {
    expect(parseMoneyAmount('4')).toBe(4)
    expect(parseMoneyAmount(4)).toBe(4)
  })

  it('treats equivalent amounts as equal', () => {
    expect(moneyAmountsEqual('5.00', 5)).toBe(true)
    expect(moneyAmountsEqual('4', 5)).toBe(false)
  })
})
