export type FirstJoinEducationVariant = 'qr_join' | 'nfc_first_stamp'

export const NFC_RETURN_VISIT_HEADLINE = 'Next visit, tap the NFC stand'

export function firstJoinEducationCopy(variant: FirstJoinEducationVariant): {
  title: string
  headline: string
  body: string
} {
  if (variant === 'nfc_first_stamp') {
    return {
      title: "You're in!",
      headline: NFC_RETURN_VISIT_HEADLINE,
      body: 'You earned your first stamp. On future visits, hold your phone near the stand at the counter.',
    }
  }

  return {
    title: "You're in!",
    headline: NFC_RETURN_VISIT_HEADLINE,
    body: 'On your next visit, hold your phone near the Flotory stand at the counter to collect stamps.',
  }
}
