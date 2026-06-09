import '../css/app.css'

import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import { loadAndApplyPlatformPalette } from './lib/applyPalette'
import router from './router'

void loadAndApplyPlatformPalette()

createApp(App).use(createPinia()).use(router).mount('#app')

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js?v=11')
  })
}
