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

const CALENDLY_SCRIPT_ID = 'flotory-calendly-widget'
const CALENDLY_STYLE_ID = 'flotory-calendly-styles'

export function loadCalendlyEmbedStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(CALENDLY_STYLE_ID)) {
    return
  }

  const link = document.createElement('link')
  link.id = CALENDLY_STYLE_ID
  link.rel = 'stylesheet'
  link.href = 'https://assets.calendly.com/assets/external/widget.css'
  document.head.appendChild(link)
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

export function loadCalendlyEmbedScript(): Promise<void> {
  if (typeof document === 'undefined') {
    return Promise.resolve()
  }

  const existing = document.getElementById(CALENDLY_SCRIPT_ID)

  if (existing) {
    return Promise.resolve()
  }

  loadCalendlyEmbedStyles()

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.id = CALENDLY_SCRIPT_ID
    script.src = 'https://assets.calendly.com/assets/external/widget.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Could not load Calendly.'))
    document.head.appendChild(script)
  })
}
