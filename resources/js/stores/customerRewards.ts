import { defineStore } from 'pinia'

import { api } from '@/lib/api'
import type { Customer, Reward } from '@/types'

export interface CustomerRewardWalletItem {
  unlock_id: number
  customer: Customer
  reward: Reward
}

export const useCustomerRewardsStore = defineStore('customerRewards', {
  state: () => ({
    pendingCount: 0,
    items: [] as CustomerRewardWalletItem[],
    loaded: false,
  }),
  actions: {
    async refresh() {
      const response = await api<{ items: CustomerRewardWalletItem[]; pending_count: number }>(
        '/customer/rewards/wallet',
      )

      this.items = response.items
      this.pendingCount = response.pending_count
      this.loaded = true
    },
    clear() {
      this.pendingCount = 0
      this.items = []
      this.loaded = false
    },
  },
})
