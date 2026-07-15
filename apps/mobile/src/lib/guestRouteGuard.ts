/**
 * Guest users may browse Venues tab and open public stack screens (venue landing, login).
 * Returns true when the guest should be sent back to Venues tab.
 */
export function guestRouteShouldRedirect(segments: readonly string[]): boolean {
  if (segments.length === 0) {
    return false
  }

  const root = segments[0]

  // Public stack routes outside the customer tab navigator.
  if (root === 'v' || root === 'login' || root === 'forgot-password' || root === 't') {
    return false
  }

  // Only lock down routes inside the customer tab group.
  if (root !== '(customer)') {
    return false
  }

  const tab = segments[1]
  return Boolean(tab && tab !== 'venues')
}
