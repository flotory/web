import type { TFunction } from 'i18next'

export type FirstJoinEducationVariant = 'qr_join' | 'nfc_first_stamp'

export const NFC_RETURN_STAMP_HEADLINE = 'Next time, tap the NFC stand'

/** @deprecated Use NFC_RETURN_STAMP_HEADLINE */
export const NFC_RETURN_VISIT_HEADLINE = NFC_RETURN_STAMP_HEADLINE

export function firstJoinEducationCopy(
  variant: FirstJoinEducationVariant,
  t: TFunction,
): {
  title: string
  headline: string
  body: string
} {
  return {
    title: t('education.youreIn'),
    headline: t('education.nfcHeadline'),
    body: variant === 'nfc_first_stamp' ? t('education.firstStampBody') : t('education.qrJoinBody'),
  }
}
