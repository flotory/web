export type DemoVenueType = 'cafe' | 'restaurant' | 'bar' | 'bakery' | 'other'

export type DemoBookingConfig = {
  calendly_url: string | null
}

export type DemoLeadPayload = {
  name: string
  email: string
  venue_name?: string
  city?: string
  venue_type?: DemoVenueType | ''
  message?: string
  source?: string
  utm_source?: string
  utm_campaign?: string
  company_website?: string
}

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
    name?: string
    email?: string
  },
): string {
  return appendUtmToCalendlyUrl(baseUrl, {
    utm_source: options.utm_source,
    utm_campaign: options.utm_campaign,
    embed_domain: options.embedHost,
    name: options.name,
    email: options.email,
  })
}
