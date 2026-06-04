import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import ScreenGradientLayout, { ScreenGradientLoading } from '../../src/components/ui/ScreenGradientLayout'
import QrImage from '../../src/components/QrImage'
import RewardRedeemedCelebration from '../../src/components/loyalty/RewardRedeemedCelebration'
import { apiRequest } from '../../src/lib/api'
import { hapticSuccess } from '../../src/lib/haptics'
import { useAuth } from '../../src/providers/AuthProvider'
import { useRealtime } from '../../src/providers/RealtimeProvider'
import { colors, radius, space, type as typography } from '../../src/theme'
import { withAppFont } from '../../src/lib/typography'

interface ClaimSessionPayload {
  token: string
  expires_at: string
  status: 'pending' | 'claimed' | 'expired'
  qr_value: string
  reward: {
    id: number
    title: string
  }
  venue: {
    id: number
    name: string
  } | null
}

export default function ClaimScreen() {
  function handleBack() {
    if (router.canGoBack()) {
      router.back()
      return
    }
    router.replace('/(customer)/rewards')
  }

  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { token } = useAuth()
  const { latestRedeem, clearLatestRedeem } = useRealtime()
  const { unlockId } = useLocalSearchParams<{ unlockId: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [session, setSession] = useState<ClaimSessionPayload | null>(null)
  const [now, setNow] = useState(Date.now())
  const [showCelebration, setShowCelebration] = useState(false)
  const ticketHapticDone = useRef(false)
  const redeemHapticDone = useRef(false)

  const expiresLabel = useMemo(() => {
    if (!session?.expires_at || session.status !== 'pending') return '0:00'
    const total = Math.max(0, Math.floor((new Date(session.expires_at).getTime() - now) / 1000))
    const minutes = Math.floor(total / 60)
    const seconds = total % 60
    return `${minutes}:${String(seconds).padStart(2, '0')}`
  }, [now, session])

  async function createSession() {
    if (!token || !unlockId) return
    setLoading(true)
    setError('')
    try {
      const response = await apiRequest<ClaimSessionPayload>(`/customer/rewards/unlocks/${unlockId}/claim-session`, {
        method: 'POST',
        token,
      })
      setSession(response)
    } catch {
      setError('Could not create claim QR session.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void createSession()
  }, [unlockId, token])

  useEffect(() => {
    if (session?.status === 'pending' && !ticketHapticDone.current) {
      ticketHapticDone.current = true
      hapticSuccess()
    }
  }, [session?.status])

  function markClaimed() {
    setSession((current) => (current ? { ...current, status: 'claimed' } : current))
    if (!redeemHapticDone.current) {
      redeemHapticDone.current = true
      hapticSuccess()
    }
    setShowCelebration(true)
    setTimeout(() => setShowCelebration(false), 2200)
  }

  useEffect(() => {
    if (!latestRedeem || !session?.token) {
      return
    }

    const tokenMatches =
      latestRedeem.claim_session_token != null && latestRedeem.claim_session_token === session.token
    const unlockMatches = unlockId != null && String(latestRedeem.unlock_id) === String(unlockId)

    if (tokenMatches || unlockMatches) {
      markClaimed()
      clearLatestRedeem()
    }
  }, [latestRedeem, session?.token, unlockId, clearLatestRedeem])

  useEffect(() => {
    if (!token || !session?.token || session.status !== 'pending') return
    const poll = setInterval(async () => {
      try {
        const next = await apiRequest<ClaimSessionPayload>(`/customer/rewards/claim-sessions/${session.token}`, { token })
        setSession(next)
        if (next.status === 'claimed') {
          markClaimed()
        }
      } catch {
        // Ignore transient poll errors.
      }
    }, 2000)

    const clock = setInterval(() => setNow(Date.now()), 1000)
    return () => {
      clearInterval(poll)
      clearInterval(clock)
    }
  }, [session?.token, session?.status, token])

  if (loading) {
    return (
      <ScreenGradientLoading>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </ScreenGradientLoading>
    )
  }

  return (
    <ScreenGradientLayout scrollable tabBarInset={false} paddingTop={insets.top + 8}>
      <View style={{ paddingHorizontal: space.screenX, gap: 12 }}>
        <Pressable onPress={handleBack} style={{ marginTop: 2 }}>
          <Text style={withAppFont({ color: colors.ink, fontWeight: '700' })}>← Back</Text>
        </Pressable>
        {error ? <Text style={{ color: colors.danger, marginTop: 8 }}>{error}</Text> : null}

        {session?.status === 'pending' ? (
          <>
            <View style={{ marginTop: 16, backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
              <View style={{ padding: 18, backgroundColor: colors.surfaceMuted }}>
                <Text style={{ ...typography.label, color: colors.primary }}>REWARD TICKET</Text>
                <Text style={withAppFont({ marginTop: 8, fontSize: 30, fontWeight: '800', color: colors.plum })}>{session.reward.title}</Text>
                <Text style={{ ...typography.body, marginTop: 4, color: colors.inkMuted }}>{session.venue?.name ?? 'Your venue'}</Text>
              </View>
              <View style={{ padding: 18, alignItems: 'center' }}>
                <Text style={{ ...typography.caption, marginBottom: 10 }}>Show this ticket at the counter</Text>
                <View style={{ backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.lavenderBorder, padding: 12 }}>
                  <QrImage value={session.qr_value} size={220} />
                </View>
              </View>
            </View>
            <View style={{ backgroundColor: colors.lavender, borderRadius: 14, padding: 12, alignItems: 'center' }}>
              <Text style={withAppFont({ color: colors.primary, fontSize: 12, fontWeight: '800' })}>EXPIRES IN</Text>
              <Text style={withAppFont({ fontSize: 34, fontWeight: '800', color: expiresLabel === '0:00' ? colors.danger : colors.plum })}>
                {expiresLabel}
              </Text>
            </View>
          </>
        ) : null}

        {session?.status === 'claimed' ? (
          <View style={{ backgroundColor: colors.successBg, borderRadius: 14, borderWidth: 1, borderColor: colors.successBorder, padding: 14, marginTop: 18 }}>
            <Text style={withAppFont({ fontSize: 18, fontWeight: '800' })}>Reward redeemed</Text>
            <Text style={{ marginTop: 4, color: colors.successText }}>Staff completed the redemption.</Text>
            <Pressable
              onPress={() => router.replace('/(customer)/rewards')}
              style={{ marginTop: 10, backgroundColor: colors.primary, borderRadius: 999, paddingVertical: 10, alignItems: 'center' }}
            >
              <Text style={withAppFont({ color: colors.primaryText, fontWeight: '800' })}>Back to rewards</Text>
            </Pressable>
          </View>
        ) : null}

        {session?.status === 'expired' ? (
          <Pressable onPress={() => void createSession()} style={{ backgroundColor: colors.primary, borderRadius: 999, paddingVertical: 12, alignItems: 'center' }}>
            <Text style={withAppFont({ color: colors.primaryText, fontWeight: '800' })}>Generate new code</Text>
          </Pressable>
        ) : null}
      </View>

      <RewardRedeemedCelebration
        visible={showCelebration}
        title={session?.reward.title}
        subtitle="Staff completed the redemption."
      />
    </ScreenGradientLayout>
  )
}
