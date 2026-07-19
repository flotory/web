import { describe, expect, it } from 'vitest'
import type { TFunction } from 'i18next'

import { firstJoinEducationCopy, NFC_RETURN_STAMP_HEADLINE } from './nfcEducation'

const t = ((key: string) =>
  ({
    'education.youreIn': "You're in!",
    'education.nfcHeadline': 'Next time, tap the NFC stand',
    'education.firstStampBody':
      'You earned your first stamp. Next time, hold your phone near the stand at the counter to collect more.',
    'education.qrJoinBody': 'Hold your phone near the Flotory stand at the counter to collect stamps.',
  })[key] ?? key) as unknown as TFunction

describe('nfcEducation', () => {
  it('uses the shared NFC headline for QR join', () => {
    const copy = firstJoinEducationCopy('qr_join', t)

    expect(copy.headline).toBe(NFC_RETURN_STAMP_HEADLINE)
    expect(copy.title).toBe("You're in!")
    expect(copy.body).toContain('collect stamps')
  })

  it('celebrates first stamp for NFC join on scan', () => {
    const copy = firstJoinEducationCopy('nfc_first_stamp', t)

    expect(copy.headline).toBe(NFC_RETURN_STAMP_HEADLINE)
    expect(copy.body).toContain('first stamp')
  })
})
