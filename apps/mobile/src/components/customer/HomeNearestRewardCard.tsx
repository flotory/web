import HomeRewardTicketCard from './HomeRewardTicketCard'
import { rewardImageUrl } from '../../lib/media'
import type { RewardWalletItem, WalletCard } from '../../types/loyalty'

export type NearestRewardFocus =
  | { kind: 'ready'; item: RewardWalletItem }
  | { kind: 'next'; card: WalletCard }

interface HomeNearestRewardCardProps {
  focus: NearestRewardFocus
}

export default function HomeNearestRewardCard({ focus }: HomeNearestRewardCardProps) {
  const isReady = focus.kind === 'ready'

  if (isReady) {
    return (
      <HomeRewardTicketCard
        variant="ready"
        title={focus.item.reward.title}
        venue={focus.item.customer.venue}
        imageUri={rewardImageUrl(focus.item.reward)}
        unlockId={focus.item.unlock_id}
      />
    )
  }

  const card = focus.card
  const stampsToGo = card.summary?.stamps_to_next ?? null
  const title = card.summary?.next_reward_title ?? 'Your next reward'

  return (
    <HomeRewardTicketCard
      variant="next"
      title={title}
      venue={card.venue}
      imageUri={rewardImageUrl({ title, image: null, image_thumb: null })}
      stampsToGo={stampsToGo}
      cardId={card.id}
      venueId={card.venue_id}
    />
  )
}
