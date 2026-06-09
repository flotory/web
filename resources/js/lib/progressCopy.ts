function visitWord(count: number): string {
  return count === 1 ? 'visit' : 'visits'
}

function rewardLabel(title: string | null | undefined): string {
  const trimmed = title?.trim()
  if (!trimmed) return 'your reward'
  const lower = trimmed.toLowerCase()
  if (lower.startsWith('free ') || lower.startsWith('your ')) return trimmed
  return trimmed
}

export function visitsToRewardCopy(remaining: number, rewardTitle?: string | null): string {
  const reward = rewardLabel(rewardTitle)
  if (remaining <= 0) return `${reward} is ready`
  return `${remaining} ${visitWord(remaining)} to ${reward}`
}

export function heroProgressTitle(remaining: number, rewardTitle?: string | null): string {
  const reward = rewardLabel(rewardTitle)
  if (remaining <= 0) return `${reward} is ready`
  if (remaining === 1) return 'One visit away'
  return `Only ${remaining} left`
}

export function heroProgressSubtitle(remaining: number, rewardTitle?: string | null): string {
  const reward = rewardLabel(rewardTitle)
  if (remaining <= 0) return 'Claim it on your next visit.'
  return `Unlock ${reward} on your next visit.`
}
