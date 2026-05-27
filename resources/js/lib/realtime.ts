import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

declare global {
  interface Window {
    Pusher: typeof Pusher
  }
}

window.Pusher = Pusher

let echo: Echo<'reverb'> | null = null
let activeToken: string | null = null

export function getEcho(token: string) {
  if (echo && activeToken === token) {
    return echo
  }

  echo?.disconnect()
  activeToken = token

  const scheme = import.meta.env.VITE_REVERB_SCHEME || 'http'
  const port = Number(import.meta.env.VITE_REVERB_PORT || 8080)
  const configuredHost = import.meta.env.VITE_REVERB_HOST
  const wsHost =
    configuredHost && !['127.0.0.1', 'localhost'].includes(configuredHost)
      ? configuredHost
      : window.location.hostname

  echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY || 'loyalty-local-key',
    wsHost,
    wsPort: port,
    wssPort: port,
    forceTLS: scheme === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: '/api/broadcasting/auth',
    auth: {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
  })

  return echo
}

export function disconnectEcho() {
  echo?.disconnect()
  echo = null
  activeToken = null
}
