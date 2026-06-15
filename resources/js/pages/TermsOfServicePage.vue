<script setup lang="ts">
import termsSource from '../../../TERMS_OF_SERVICE.md?raw'

import LegalDocumentPage from '@/pages/LegalDocumentPage.vue'
</script>

<template>
  <LegalDocumentPage :source="termsSource" />
</template>
