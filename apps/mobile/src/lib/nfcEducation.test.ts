import { describe, expect, it } from 'vitest'

import { firstJoinEducationCopy, NFC_RETURN_STAMP_HEADLINE } from './nfcEducation'

describe('nfcEducation', () => {
  it('uses the shared NFC headline for QR join', () => {
    const copy = firstJoinEducationCopy('qr_join')

    expect(copy.headline).toBe(NFC_RETURN_STAMP_HEADLINE)
    expect(copy.title).toBe("You're in!")
    expect(copy.body).toContain('collect stamps')
  })

  it('celebrates first stamp for NFC join on scan', () => {
    const copy = firstJoinEducationCopy('nfc_first_stamp')

    expect(copy.headline).toBe(NFC_RETURN_STAMP_HEADLINE)
    expect(copy.body).toContain('first stamp')
  })
})
