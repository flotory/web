import { MARKETING_HOME_PATH } from '@/lib/brand'

type MarketingHistoryState = {
  back?: string | null
}

export function hasMarketingHistoryBack(historyState: MarketingHistoryState): boolean {
  const back = historyState.back

  return typeof back === 'string' && back.length > 0
}

export function resolveMarketingBack(
  historyState: MarketingHistoryState,
  fallbackTo: string = MARKETING_HOME_PATH,
): 'back' | string {
  return hasMarketingHistoryBack(historyState) ? 'back' : fallbackTo
}
