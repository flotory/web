import { useEffect, useState } from 'react'

import { evaluateAppUpdateGate, fetchRemoteAppConfig, type AppUpdateGateResult } from '../lib/appUpdate'

const defaultGate: AppUpdateGateResult = {
  blocked: false,
  currentVersion: '0.0.0',
  requiredVersion: null,
  updateUrl: 'https://flotory.com/app',
}

export function useAppUpdateGate() {
  const [ready, setReady] = useState(false)
  const [gate, setGate] = useState<AppUpdateGateResult>(defaultGate)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const config = await fetchRemoteAppConfig()
      if (cancelled) {
        return
      }

      setGate(evaluateAppUpdateGate(config))
      setReady(true)
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  return {
    ready,
    blocked: gate.blocked,
    currentVersion: gate.currentVersion,
    requiredVersion: gate.requiredVersion,
    updateUrl: gate.updateUrl,
  }
}
