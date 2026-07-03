<script setup lang="ts">
import { RouterLink } from 'vue-router'

import { FLOTORY_APP_NAME } from '@/lib/brand'
import { legalConfig } from '@/lib/legalConfig'
</script>

<template>
  <footer class="border-t border-border/60 pt-8 text-center text-sm text-ink-muted">
    <nav class="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
      <RouterLink to="/privacy" class="font-semibold text-ink-soft hover:text-ink">
        Privacy
      </RouterLink>
      <RouterLink to="/terms" class="font-semibold text-ink-soft hover:text-ink">
        Terms
      </RouterLink>
      <RouterLink to="/contact" class="font-semibold text-ink-soft hover:text-ink">
        Contact
      </RouterLink>
      <a :href="`mailto:${legalConfig.supportEmail}`" class="font-semibold text-ink-soft hover:text-ink">
        Support
      </a>
    </nav>
    <p class="mt-3 text-xs text-ink-muted/90">
      © {{ new Date().getFullYear() }} {{ FLOTORY_APP_NAME }}
    </p>
  </footer>
</template>
