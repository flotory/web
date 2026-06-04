import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, Text, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import ScreenGradientLayout, { ScreenGradientLoading } from '../../src/components/ui/ScreenGradientLayout'
import { StickyBackHeader } from '../../src/components/ui/StickyBackButton'
import QrImage from '../../src/components/QrImage'
import RewardRedeemedSuccessCard from '../../src/components/loyalty/RewardRedeemedSuccessCard'
import PrimaryButton from '../../src/components/ui/PrimaryButton'
import StateCard from '../../src/components/ui/StateCard'
import { ApiError, apiRequest } from '../../src/lib/api'
import { invalidateCustomerRewardCaches } from '../../src/lib/customerData'
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

function parseUnlockId(value: string | undefined): number | null {
  if (!value || value === 'undefined' || value === 'null') {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export default function ClaimScreen() {
  function handleBack() {
    if (router.canGoBack()) {
      router.back()
      return
    }
    router.replace('/(customer)/wallet')
  }

  function goToWallet() {
    router.replace('/(customer)/wallet')
  }

  const insets = useSafeAreaInsets()
  const { height: windowHeight } = useWindowDimensions()
  const router = useRouter()
  const { token } = useAuth()
  const { latestRedeem, clearLatestRedeem } = useRealtime()
  const { unlockId: unlockIdParam } = useLocalSearchParams<{ unlockId: string }>()
  const unlockId = useMemo(() => parseUnlockId(unlockIdParam), [unlockIdParam])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [session, setSession] = useState<ClaimSessionPayload | null>(null)
  const [now, setNow] = useState(Date.now())
  const ticketHapticDone = useRef(false)
  const redeemHapticDone = useRef(false)

  const expiresLabel = useMemo(() => {
    if (!session?.expires_at || session.status !== 'pending') return '0:00'
    const total = Math.max(0, Math.floor((new Date(session.expires_at).getTime() - now) / 1000))
    const minutes = Math.floor(total / 60)
    const seconds = total % 60
    return `${minutes}:${String(seconds).padStart(2, '0')}`
  }, [now, session])

  const createSession = useCallback(async () => {
    if (!token) {
      setError('Sign in again to claim this reward.')
      setLoading(false)
      return
    }

    if (unlockId == null) {
      setError('This reward is not ready to claim yet. Open your card, pull to refresh, then try again.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await apiRequest<ClaimSessionPayload>(
        `/customer/rewards/unlocks/${unlockId}/claim-session`,
        { method: 'POST', token },
      )
      setSession(response)
    } catch (exception) {
      if (exception instanceof ApiError) {
        setError(exception.message)
      } else {
        setError('Could not load your claim ticket. Check your connection and try again.')
      }
    } finally {
      setLoading(false)
    }
  }, [token, unlockId])

  const refreshAndRetry = useCallback(async () => {
    if (!token) {
      await createSession()
      return
    }

    invalidateCustomerRewardCaches(token)
    await createSession()
  }, [createSession, token])

  useEffect(() => {
    void createSession()
  }, [createSession])

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
    if (token) {
      invalidateCustomerRewardCaches(token)
    }
  }

  useEffect(() => {
    if (!latestRedeem || !session?.token) {
      return
    }

    const tokenMatches =
      latestRedeem.claim_session_token != null && latestRedeem.claim_session_token === session.token
    const unlockMatches = unlockId != null && latestRedeem.unlock_id === unlockId

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

  const isClaimed = session?.status === 'claimed'
  const showError = Boolean(error) && !session

  if (loading) {
    return (
      <ScreenGradientLoading>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </ScreenGradientLoading>
    )
  }

  const useCenteredLayout = isClaimed || showError

  return (
    <ScreenGradientLayout
      scrollable={!useCenteredLayout}
      flexContent={useCenteredLayout}
      tabBarInset={false}
      paddingTop={useCenteredLayout ? 0 : 0}
      fixedHeader={
        useCenteredLayout ? null : <StickyBackHeader onPress={handleBack} topInset={insets.top} />
      }
    >
      {isClaimed && session ? (
        <View
          style={{
            flex: 1,
            minHeight: windowHeight - insets.top - insets.bottom,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: space.screenX,
            paddingTop: insets.top,
            paddingBottom: insets.bottom + 20,
          }}
        >
          <View style={{ width: '100%', maxWidth: 380 }}>
            <RewardRedeemedSuccessCard
              centered
              rewardTitle={session.reward.title}
              venueName={session.venue?.name}
              onBackToWallet={goToWallet}
            />
          </View>
        </View>
      ) : (
      <View style={{ paddingHorizontal: space.screenX, gap: 12, flex: showError ? 1 : undefined, justifyContent: showError ? 'center' : undefined }}>
        {showError ? (
          <View>
            <StateCard
              emoji="🎫"
              title="Can't open claim ticket"
              message={error}
              primaryAction={{ label: 'Try again', onPress: () => void refreshAndRetry() }}
              secondaryAction={{ label: 'Back to wallet', onPress: goToWallet }}
            />
            <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border }}>
              <Ionicons name="information-circle-outline" size={22} color={colors.inkMuted} />
              <Text style={{ flex: 1, fontSize: 13, lineHeight: 19, color: colors.inkMuted }}>
                Only rewards listed under Ready in Rewards or on your card can be claimed. If you just earned stamps, refresh your card first.
              </Text>
            </View>
          </View>
        ) : null}

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

        {session?.status === 'expired' ? (
          <PrimaryButton label="Generate new code" onPress={() => void createSession()} style={{ marginTop: 12 }} />
        ) : null}
      </View>
      )}
    </ScreenGradientLayout>
  )
}
