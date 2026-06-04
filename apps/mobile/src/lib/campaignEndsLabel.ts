export function campaignEndsLabel(daysLeft: number | null | undefined): string | null {
  if (daysLeft == null || daysLeft < 0) return null
  if (daysLeft === 0) return 'Ends today'
  if (daysLeft === 1) return 'Ends in 1d'
  return `Ends in ${daysLeft}d`
}
