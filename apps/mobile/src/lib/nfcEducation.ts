export type FirstJoinEducationVariant = 'qr_join' | 'nfc_first_stamp'

export const NFC_RETURN_STAMP_HEADLINE = 'Next time, tap the NFC stand'

/** @deprecated Use NFC_RETURN_STAMP_HEADLINE */
export const NFC_RETURN_VISIT_HEADLINE = NFC_RETURN_STAMP_HEADLINE

export function firstJoinEducationCopy(variant: FirstJoinEducationVariant): {
  title: string
  headline: string
  body: string
} {
  if (variant === 'nfc_first_stamp') {
    return {
      title: "You're in!",
      headline: NFC_RETURN_STAMP_HEADLINE,
      body: 'You earned your first stamp. Next time, hold your phone near the stand at the counter to collect more.',
    }
  }

  return {
    title: "You're in!",
    headline: NFC_RETURN_STAMP_HEADLINE,
    body: 'Hold your phone near the Flotory stand at the counter to collect stamps.',
  }
}
