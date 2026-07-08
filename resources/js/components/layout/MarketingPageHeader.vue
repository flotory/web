<script setup lang="ts">
import { RouterLink } from 'vue-router'

import FlotoryLogo from '@/components/brand/FlotoryLogo.vue'
import AppButton from '@/components/ui/AppButton.vue'
import LocaleSwitcher from '@/components/ui/LocaleSwitcher.vue'
import { MARKETING_HOME_PATH } from '@/lib/brand'
</script>

<template>
  <div>
    <header class="marketing-page-header fixed inset-x-0 top-0 z-40" data-testid="marketing-header">
      <div
        class="mx-auto flex h-[4.25rem] max-w-6xl items-center justify-between gap-3 px-5 sm:h-[4.5rem] sm:px-6"
      >
        <RouterLink :to="MARKETING_HOME_PATH" class="inline-flex min-w-0" aria-label="Flotory home">
          <FlotoryLogo size="lg" />
        </RouterLink>
        <nav class="flex shrink-0 items-center gap-2 sm:gap-3" aria-label="Marketing">
          <LocaleSwitcher id="marketing-locale" />
          <RouterLink to="/pricing" class="hidden sm:inline-flex">
            <AppButton variant="ghost">Pricing</AppButton>
          </RouterLink>
          <RouterLink to="/faq" class="hidden sm:inline-flex">
            <AppButton variant="ghost">FAQ</AppButton>
          </RouterLink>
          <RouterLink to="/login" class="hidden sm:inline-flex">
            <AppButton variant="primary" size="sm">Log in</AppButton>
          </RouterLink>
        </nav>
      </div>
    </header>
    <!-- Reserve space so content is not hidden under the fixed header -->
    <div class="h-[4.25rem] sm:h-[4.5rem]" aria-hidden="true" />
  </div>
</template>
