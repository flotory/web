import { describe, expect, it } from 'vitest'
import type { TFunction } from 'i18next'

import en from '../i18n/locales/en'
import {
  buildScanLandingQuickFacts,
  categoryEmoji,
  formatHeroRewardLine,
  formatHeroSubtitle,
  formatMemberStampCaption,
  formatSocialCount,
  formatUnlockRequirement,
  membershipFromWalletCard,
  progressDotSymbols,
} from './venueScanLanding'

// Resolve real en strings with i18next-style plural + {{var}} interpolation.
const t = ((key: string, opts?: Record<string, unknown>) => {
  const [ns, ...rest] = key.split('.')
  const leaf = rest.join('.')
  const table = (en as Record<string, Record<string, string>>)[ns] ?? {}
  const count = opts?.count as number | undefined
  let str =
    table[leaf] ??
    (count != null ? table[`${leaf}_${count === 1 ? 'one' : 'other'}`] : undefined) ??
    key
  if (opts) {
    for (const [k, v] of Object.entries(opts)) {
      str = str.replace(new RegExp(`{{${k}}}`, 'g'), String(v))
    }
  }
  return str
}) as unknown as TFunction

describe('venueScanLanding mobile', () => {
  it('formats hero line and progress dots', () => {
    expect(formatHeroRewardLine({ id: 1, title: 'Free coffee', required_stamps: 10 }, 'Coffee Lab', t)).toBe('Free coffee')
    expect(formatHeroRewardLine(null, 'Coffee Lab', t)).toBe('Collect stamps at Coffee Lab and unlock rewards.')
    expect(formatUnlockRequirement(3, t)).toBe('Unlocks after 3 stamps')
    expect(formatUnlockRequirement(1, t)).toBe('Unlocks after 1 stamp')
    expect(progressDotSymbols(10, 5)).toContain('●')
    expect(formatHeroSubtitle('Coffee Lab', t)).toContain('Coffee Lab')
  })

  it('builds quick facts and social proof labels', () => {
    expect(buildScanLandingQuickFacts({ firstRewardStamps: 3, milestoneCount: 2 }, t)).toEqual([
      { icon: 'stamps', text: 'First reward unlocks after 3 stamps' },
      { icon: 'rewards', text: '2 rewards available' },
      { icon: 'join', text: 'Takes less than 30 seconds to join' },
    ])
    expect(
      buildScanLandingQuickFacts(
        {
          firstRewardStamps: 5,
          milestoneCount: 1,
          membership: { stamps: 4, target: 5, stampsToNext: 1, pendingRewardsCount: 0 },
        },
        t,
      ),
    ).toEqual([
      { icon: 'stamps', text: '4 / 5 stamps on your card' },
      { icon: 'stamps', text: '1 stamp to next reward' },
      { icon: 'nfc', text: 'Tap the NFC stand at the counter to collect stamps' },
    ])
    expect(formatMemberStampCaption({ stamps: 4, target: 5, stampsToNext: 1, pendingRewardsCount: 0 }, t)).toBe(
      '1 stamp to your next reward',
    )
    expect(membershipFromWalletCard({ stamps: 7, summary: { stamps: 7, next_reward_stamps: 10, stamps_to_next: 3 } })).toEqual({
      stamps: 7,
      target: 10,
      stampsToNext: 3,
      pendingRewardsCount: 0,
    })
    expect(formatSocialCount(0, 'member', 'members')).toBeNull()
    expect(formatSocialCount(1, 'member', 'members')).toBe('1 member')
    expect(formatSocialCount(12, 'member', 'members')).toBe('12 members')
  })

  it('maps venue categories to emoji', () => {
    expect(categoryEmoji('cafe')).toBe('☕')
    expect(categoryEmoji('bar')).toBe('🍸')
    expect(categoryEmoji('salon')).toBe('💇')
    expect(categoryEmoji('other')).toBe('🎁')
    expect(categoryEmoji('unknown')).toBe('☕')
  })
})
