import { describe, expect, it } from 'vitest'

import { faqItems, faqSections } from '@/lib/faqContent'

describe('faqContent', () => {
  it('defines sections with unique ids and non-empty items', () => {
    const sectionIds = faqSections.map((section) => section.id)
    expect(new Set(sectionIds).size).toBe(sectionIds.length)

    for (const section of faqSections) {
      expect(section.title.length).toBeGreaterThan(0)
      expect(section.items.length).toBeGreaterThan(0)

      for (const item of section.items) {
        expect(item.question.length).toBeGreaterThan(0)
        expect(item.answer.length).toBeGreaterThan(0)
      }
    }
  })

  it('uses unique item ids across all sections', () => {
    const itemIds = faqItems.map((item) => item.id)
    expect(new Set(itemIds).size).toBe(itemIds.length)
  })
})
