import Echo from 'laravel-echo'
import Pusher from 'pusher-js/react-native'

import { reverbConfig } from './realtimeConfig'

let echo: Echo<'reverb'> | null = null
let activeToken: string | null = null

function usesProductionWebsocketProxy(): boolean {
  return (
    reverbConfig.scheme === 'https' &&
    !['localhost', '127.0.0.1'].includes(reverbConfig.host)
  )
}

function createPusherClient(): Pusher {
  const wsPath = usesProductionWebsocketProxy() ? '/app' : undefined

  return new Pusher(reverbConfig.key, {
    cluster: '',
    wsHost: reverbConfig.host,
    wsPort: reverbConfig.port,
    wssPort: reverbConfig.port,
    wsPath,
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

  const wsPath = usesProductionWebsocketProxy() ? '/app' : undefined

  echo = new Echo({
    broadcaster: 'reverb',
    key: reverbConfig.key,
    wsHost: reverbConfig.host,
    wsPort: reverbConfig.port,
    wssPort: reverbConfig.port,
    wsPath,
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
