import { describe, expect, it } from 'vitest'

import { appendUtmToCalendlyUrl, buildCalendlyEmbedUrl } from './demoBooking'

describe('appendUtmToCalendlyUrl', () => {
  it('appends utm parameters to a calendly url', () => {
    const url = appendUtmToCalendlyUrl('https://calendly.com/flotory/demo', {
      utm_source: 'landing',
      utm_campaign: 'hero',
    })

    expect(url).toContain('utm_source=landing')
    expect(url).toContain('utm_campaign=hero')
  })

  it('returns the original url when parsing fails', () => {
    expect(appendUtmToCalendlyUrl('not-a-url', { utm_source: 'landing' })).toBe('not-a-url')
  })
})

describe('buildCalendlyEmbedUrl', () => {
  it('includes embed domain for Calendly inline embeds', () => {
    const url = buildCalendlyEmbedUrl('https://calendly.com/flotoryapp/30min', {
      utm_source: 'landing',
      utm_campaign: 'hero',
      embedHost: 'localhost',
    })

    expect(url).toContain('embed_domain=localhost')
    expect(url).toContain('utm_source=landing')
  })
})
