function stampWord(count: number): string {
  return count === 1 ? 'stamp' : 'stamps'
}

function rewardLabel(title: string | null | undefined): string {
  const trimmed = title?.trim()
  if (!trimmed) return 'your reward'
  const lower = trimmed.toLowerCase()
  if (lower.startsWith('free ') || lower.startsWith('your ')) return trimmed
  return trimmed
}

/** e.g. "2 stamps to free coffee" */
export function visitsToRewardCopy(remaining: number, rewardTitle?: string | null): string {
  const reward = rewardLabel(rewardTitle)
  if (remaining <= 0) return `${reward} is ready`
  return `${remaining} ${stampWord(remaining)} to ${reward}`
}

/** e.g. "Only 2 left until free coffee" */
export function heroProgressTitle(remaining: number, rewardTitle?: string | null): string {
  const reward = rewardLabel(rewardTitle)
  if (remaining <= 0) return `${reward} is ready`
  if (remaining === 1) return 'One stamp away'
  return `Only ${remaining} left`
}

export function heroProgressSubtitle(remaining: number, rewardTitle?: string | null): string {
  const reward = rewardLabel(rewardTitle)
  if (remaining <= 0) return 'Claim it on your next stamp.'
  return `Unlock ${reward} on your next stamp.`
}

/** Secondary line under progress bar */
export function progressHintCopy(remaining: number, rewardTitle?: string | null): string {
  if (remaining <= 0) return rewardLabel(rewardTitle) + ' is ready to claim'
  return visitsToRewardCopy(remaining, rewardTitle)
}

/** Compact numeric progress (kept subtle) */
export function progressCountCopy(current: number, target: number): string {
  return `${current} of ${target} ${stampWord(target)}`
}

export function walletCardProgressCopy(
  stamps: number,
  max: number,
  toNext: number,
  nextTitle?: string | null,
): { primary: string; secondary: string } {
  const reward = rewardLabel(nextTitle)
  if (toNext <= 0) {
    return {
      primary: progressCountCopy(Math.min(stamps, max), max),
      secondary: `${reward} is ready`,
    }
  }
  return {
    primary: visitsToRewardCopy(toNext, nextTitle),
    secondary: progressCountCopy(Math.min(stamps, max), max),
  }
}
