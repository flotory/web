import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import laravel from 'laravel-vite-plugin'
import { defineConfig } from 'vite'

const apiProxyTarget = process.env.VITE_API_PROXY_TARGET || 'http://localhost:8000'

export default defineConfig({
  server: {
    host: '0.0.0.0',
    origin: process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173',
    cors: true,
    hmr: {
      host: process.env.VITE_HMR_HOST || 'localhost',
    },
    // Visiting :5173 directly still needs Laravel for /api/* (login, venues, etc.).
    proxy: {
      '/api': { target: apiProxyTarget, changeOrigin: true },
      '/auth/google': { target: apiProxyTarget, changeOrigin: true },
    },
  },
  plugins: [
    laravel({
      input: ['resources/css/app.css', 'resources/js/app.ts'],
      refresh: true,
    }),
    vue(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': '/resources/js',
    },
  },
})
