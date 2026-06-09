<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import EmptyState from '@/components/ui/EmptyState.vue'
import { api } from '@/lib/api'
import type { Customer } from '@/types'

const route = useRoute()
const router = useRouter()

onMounted(async () => {
  const queryVenueId = route.query.venue_id
  if (typeof queryVenueId === 'string' && queryVenueId.length > 0) {
    await router.replace({ name: 'customer-wallet', query: { venue_id: queryVenueId } })
    return
  }

  const cardId = String(route.params.cardId ?? '')

  try {
    const response = await api<{ cards: Customer[] }>('/customer/cards')
    const card = response.cards.find((entry) => String(entry.id) === cardId)
    if (card) {
      await router.replace({ name: 'customer-wallet', query: { venue_id: String(card.venue_id) } })
      return
    }
  } catch {
    // fall through
  }

  await router.replace('/wallet')
})
</script>

<template>
  <EmptyState compact title="Opening card…" />
</template>
