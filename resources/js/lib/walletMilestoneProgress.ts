import type { CustomerCardSummary } from '@/types'

export interface WalletMilestoneProgress {
  current: number
  target: number
  toNext: number
  milestoneStamp: number
}

/** Progress toward the nearest unreached reward milestone (e.g. 4/5, not 4/10). */
export function walletMilestoneProgress(
  summary: CustomerCardSummary | null | undefined,
  fallbackStamps = 0,
): WalletMilestoneProgress {
  const stamps = summary?.stamps ?? fallbackStamps
  const target = Math.max(summary?.next_reward_stamps ?? summary?.max_stamps ?? 10, 1)
  const current = Math.min(Math.max(stamps, 0), target)
  const toNext =
    summary?.stamps_to_next != null ? Math.max(summary.stamps_to_next, 0) : Math.max(target - stamps, 0)

  return { current, target, toNext, milestoneStamp: target }
}
