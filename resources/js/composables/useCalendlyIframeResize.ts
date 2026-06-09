import { onBeforeUnmount, onMounted, ref } from 'vue'

import {
  CALENDLY_EMBED_ORIGIN,
  CALENDLY_IFRAME_DEFAULT_HEIGHT,
  calendlyIframeHeightFromMessage,
} from '@/lib/demoBooking'

export function useCalendlyIframeResize() {
  const iframeHeight = ref(CALENDLY_IFRAME_DEFAULT_HEIGHT)

  function onMessage(event: MessageEvent) {
    if (event.origin !== CALENDLY_EMBED_ORIGIN) {
      return
    }

    const nextHeight = calendlyIframeHeightFromMessage(event.data)

    if (nextHeight !== null) {
      iframeHeight.value = nextHeight
    }
  }

  onMounted(() => {
    window.addEventListener('message', onMessage)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('message', onMessage)
  })

  return { iframeHeight }
}
