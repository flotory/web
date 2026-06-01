<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import CustomerWalletDetail from '@/pages/customer/CustomerWalletDetail.vue'
import CustomerWalletList from '@/pages/customer/CustomerWalletList.vue'

const route = useRoute()

const showDetail = computed(() => {
  const venueId = route.query.venue_id

  return typeof venueId === 'string' && venueId.length > 0
})
</script>

<template>
  <CustomerWalletDetail v-if="showDetail" />
  <CustomerWalletList v-else />
</template>
