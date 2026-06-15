<script setup lang="ts">
import privacySource from '../../../PRIVACY_POLICY.md?raw'

import LegalDocumentPage from '@/pages/LegalDocumentPage.vue'
</script>

<template>
  <LegalDocumentPage :source="privacySource" />
</template>
