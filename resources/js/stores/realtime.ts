import { defineStore } from 'pinia'
import type { Router } from 'vue-router'

import { api } from '@/lib/api'
import { disconnectEcho, getEcho } from '@/lib/realtime'
import { useAuthStore } from '@/stores/auth'
import type { Customer, StampAddedPayload } from '@/types'

export const useRealtimeStore = defineStore('realtime', {
  state: () => ({
    latestStamp: null as StampAddedPayload | null,
    subscribedCustomerIds: [] as number[],
    startedForToken: null as string | null,
  }),
  actions: {
    async startCustomerListeners(router: Router) {
      const auth = useAuthStore()

      if (!auth.token || auth.user?.is_admin) {
        this.stop()
        return
      }

      if (this.startedForToken === auth.token && this.subscribedCustomerIds.length > 0) {
        return
      }

      this.stop()
      this.startedForToken = auth.token

      const echo = getEcho(auth.token)
      const { cards } = await api<{ cards: Customer[] }>('/customer/cards')

      cards.forEach((card) => {
        this.subscribedCustomerIds.push(card.id)

        echo.private(`customer.${card.id}`).listen('.stamp.added', (payload: StampAddedPayload) => {
          this.latestStamp = payload

          const currentVenueId = Number(router.currentRoute.value.query.venue_id)
          const routeName = router.currentRoute.value.name
          const shouldRedirect =
            routeName !== 'customer-card' ||
            (routeName === 'customer-card' && currentVenueId !== payload.venue.id)

          if (shouldRedirect) {
            router.push({
              name: 'customer-card',
              query: { venue_id: String(payload.venue.id) },
            })
          }
        })
      })
    },
    stop() {
      if (this.subscribedCustomerIds.length > 0 && this.startedForToken) {
        const echo = getEcho(this.startedForToken)
        this.subscribedCustomerIds.forEach((id) => echo.leave(`customer.${id}`))
      }

      this.subscribedCustomerIds = []
      this.startedForToken = null
      this.latestStamp = null
      disconnectEcho()
    },
    clearLatestStamp() {
      this.latestStamp = null
    },
  },
})
