export function buildGoogleMapsSearchUrl(address: string): string {
  const query = address.trim()
  if (!query) {
    return ''
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

export function hasVenueAddress(address: string | null | undefined): boolean {
  return Boolean(address?.trim())
}
