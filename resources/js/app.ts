import '../css/app.css'

import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import { i18n, setActiveLocale, getActiveLocale } from './i18n'
import { loadAndApplyPlatformPalette } from './lib/applyPalette'
import router from './router'

void loadAndApplyPlatformPalette()
setActiveLocale(getActiveLocale())

createApp(App).use(createPinia()).use(i18n).use(router).mount('#app')

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js?v=12')
  })
}
