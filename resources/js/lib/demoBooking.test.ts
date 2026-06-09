import { describe, expect, it } from 'vitest'

import {
  appendUtmToCalendlyUrl,
  buildCalendlyEmbedUrl,
  calendlyIframeHeightFromMessage,
} from './demoBooking'

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
  it('includes inline embed params for Calendly iframe resize', () => {
    const url = buildCalendlyEmbedUrl('https://calendly.com/flotoryapp/30min', {
      utm_source: 'landing',
      utm_campaign: 'hero',
      embedHost: 'localhost',
    })

    expect(url).toContain('embed_domain=localhost')
    expect(url).toContain('embed_type=Inline')
    expect(url).toContain('hide_event_type_details=1')
    expect(url).toContain('utm_source=landing')
  })
})

describe('calendlyIframeHeightFromMessage', () => {
  it('reads page height from calendly postMessage payload', () => {
    expect(
      calendlyIframeHeightFromMessage({
        event: 'calendly.page_height',
        payload: { height: 912.4 },
      }),
    ).toBe(913)
  })

  it('ignores unrelated messages', () => {
    expect(calendlyIframeHeightFromMessage({ event: 'calendly.event_scheduled' })).toBeNull()
  })
})
