import Constants from 'expo-constants'
import { Platform } from 'react-native'

import { API_BASE_URL, webAppOrigin } from './config'
import {
  evaluateAppUpdateGate as evaluateGate,
  type AppPlatform,
  type AppUpdateGateResult,
  type RemoteAppConfig,
} from './appUpdatePolicy'

export type { AppPlatform, AppUpdateGateResult, RemoteAppConfig } from './appUpdatePolicy'

export function currentAppVersion(): string {
  return Constants.expoConfig?.version ?? '0.0.0'
}

export function resolveAppPlatform(platformOs = Platform.OS): AppPlatform {
  if (platformOs === 'ios' || platformOs === 'android') {
    return platformOs
  }

  return 'web'
}

export function evaluateAppUpdateGate(config: RemoteAppConfig | null): AppUpdateGateResult {
  return evaluateGate(config, {
    currentVersion: currentAppVersion(),
    platform: resolveAppPlatform(),
    fallbackUpdateUrl: `${webAppOrigin()}/app`,
  })
}

export async function fetchRemoteAppConfig(): Promise<RemoteAppConfig | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/public/app-config`, {
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      return null
    }

    return (await response.json()) as RemoteAppConfig
  } catch {
    return null
  }
}
