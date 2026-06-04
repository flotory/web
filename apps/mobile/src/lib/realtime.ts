import Echo from 'laravel-echo'
import Pusher from 'pusher-js/react-native'

import { reverbConfig } from './realtimeConfig'

let echo: Echo<'reverb'> | null = null
let activeToken: string | null = null

function createPusherClient(): Pusher {
  return new Pusher(reverbConfig.key, {
    cluster: '',
    wsHost: reverbConfig.host,
    wsPort: reverbConfig.port,
    wssPort: reverbConfig.port,
    forceTLS: reverbConfig.scheme === 'https',
    enabledTransports: ['ws', 'wss'],
    disableStats: true,
  })
}

export function getEcho(token: string): Echo<'reverb'> {
  if (echo && activeToken === token) {
    return echo
  }

  disconnectEcho()
  activeToken = token

  echo = new Echo({
    broadcaster: 'reverb',
    key: reverbConfig.key,
    wsHost: reverbConfig.host,
    wsPort: reverbConfig.port,
    wssPort: reverbConfig.port,
    forceTLS: reverbConfig.scheme === 'https',
    enabledTransports: ['ws', 'wss'],
    disableStats: true,
    client: createPusherClient(),
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
  if (!echo) {
    activeToken = null
    return
  }

  const instance = echo
  echo = null
  activeToken = null

  try {
    instance.leaveAllChannels()
  } catch {
    // Cleanup during Fast Refresh can race; realtime is optional.
  }

  try {
    instance.disconnect()
  } catch {
    // Same as above — avoid crashing the app on teardown.
  }
}
