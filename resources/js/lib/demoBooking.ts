export type DemoBookingConfig = {
  calendly_url: string | null
}

export const CALENDLY_EMBED_ORIGIN = 'https://calendly.com'

/** Fallback before Calendly posts its preferred inline height */
export const CALENDLY_IFRAME_DEFAULT_HEIGHT = 820

export function appendUtmToCalendlyUrl(baseUrl: string, query: Record<string, string | undefined>): string {
  try {
    const url = new URL(baseUrl)

    for (const [key, value] of Object.entries(query)) {
      if (value) {
        url.searchParams.set(key, value)
      }
    }

    return url.toString()
  } catch {
    return baseUrl
  }
}

export function buildCalendlyEmbedUrl(
  baseUrl: string,
  options: {
    utm_source?: string
    utm_campaign?: string
    embedHost?: string
  },
): string {
  return appendUtmToCalendlyUrl(baseUrl, {
    utm_source: options.utm_source,
    utm_campaign: options.utm_campaign,
    embed_domain: options.embedHost,
    embed_type: 'Inline',
    hide_event_type_details: '1',
    hide_gdpr_banner: '1',
  })
}

export function calendlyIframeHeightFromMessage(data: unknown, minHeight = 680): number | null {
  if (typeof data !== 'object' || data === null) {
    return null
  }

  const message = data as { event?: string; payload?: { height?: number } }

  if (message.event !== 'calendly.page_height' || typeof message.payload?.height !== 'number') {
    return null
  }

  return Math.max(Math.ceil(message.payload.height), minHeight)
}
