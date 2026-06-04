import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

import { reverbConfig } from './realtimeConfig'

const globalScope = globalThis as typeof globalThis & { Pusher?: typeof Pusher }
globalScope.Pusher = Pusher

let echo: Echo<'reverb'> | null = null
let activeToken: string | null = null

export function getEcho(token: string): Echo<'reverb'> {
  if (echo && activeToken === token) {
    return echo
  }

  echo?.disconnect()
  activeToken = token

  echo = new Echo({
    broadcaster: 'reverb',
    key: reverbConfig.key,
    wsHost: reverbConfig.host,
    wsPort: reverbConfig.port,
    wssPort: reverbConfig.port,
    forceTLS: reverbConfig.scheme === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: reverbConfig.authEndpoint,
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
