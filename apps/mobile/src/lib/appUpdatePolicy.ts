import { isAppVersionBelow } from './semver'

export interface RemoteAppConfig {
  min_ios_version?: string | null
  min_android_version?: string | null
  force_update?: boolean
  ios_update_url?: string | null
  android_update_url?: string | null
}

export type AppPlatform = 'ios' | 'android' | 'web'

export interface AppUpdateGateResult {
  blocked: boolean
  currentVersion: string
  requiredVersion: string | null
  updateUrl: string
}

export function minimumVersionForPlatform(config: RemoteAppConfig, platform: AppPlatform): string | null {
  if (platform === 'ios') {
    return config.min_ios_version ?? null
  }

  if (platform === 'android') {
    return config.min_android_version ?? null
  }

  return null
}

export function updateUrlForPlatform(config: RemoteAppConfig, platform: AppPlatform, fallbackUrl: string): string {
  if (platform === 'ios') {
    return config.ios_update_url?.trim() || fallbackUrl
  }

  if (platform === 'android') {
    return config.android_update_url?.trim() || fallbackUrl
  }

  return fallbackUrl
}

export function evaluateAppUpdateGate(
  config: RemoteAppConfig | null,
  options: {
    currentVersion: string
    platform: AppPlatform
    fallbackUpdateUrl: string
  },
): AppUpdateGateResult {
  const { currentVersion, platform, fallbackUpdateUrl } = options

  if (!config) {
    return {
      blocked: false,
      currentVersion,
      requiredVersion: null,
      updateUrl: fallbackUpdateUrl,
    }
  }

  const requiredVersion = minimumVersionForPlatform(config, platform)
  const outdated = isAppVersionBelow(currentVersion, requiredVersion)
  const blocked = Boolean(config.force_update) && outdated

  return {
    blocked,
    currentVersion,
    requiredVersion,
    updateUrl: updateUrlForPlatform(config, platform, fallbackUpdateUrl),
  }
}
