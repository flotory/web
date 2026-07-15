import { describe, expect, it } from 'vitest'

import {
  authFieldClass,
  formFieldClass,
  formFieldClassSm,
  formSelectClass,
  formTextareaClass,
} from './authForm'

describe('authForm class tokens', () => {
  it('keeps shared rounded-2xl border contract', () => {
    for (const token of [authFieldClass, formFieldClass, formSelectClass, formTextareaClass]) {
      expect(token).toContain('rounded-2xl')
      expect(token).toContain('border-border')
      expect(token).toContain('bg-surface')
    }
  })

  it('uses compact height for sm fields', () => {
    expect(formFieldClassSm).toContain('h-11')
    expect(formFieldClass).toContain('h-12')
  })

  it('adds auth focus ring on dark layouts', () => {
    expect(authFieldClass).toContain('focus:ring-2')
    expect(formFieldClass).not.toContain('focus:ring-2')
  })
})
