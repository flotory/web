import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'

import { ApiError, apiRequest } from '../../src/lib/api'
import { useAuth } from '../../src/providers/AuthProvider'
import { colors } from '../../src/theme'
import { withAppFont } from '../../src/lib/typography'

interface LandingPayload {
  venue: {
    id: number
    name: string
    slug: string
    address?: string | null
  }
  milestones: Array<{
    id: number
    title: string
    required_stamps: number
  }>
}

export default function VenueJoinScreen() {
  const router = useRouter()
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const { token, role } = useAuth()
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')
  const [landing, setLanding] = useState<LandingPayload | null>(null)

  useEffect(() => {
    async function load() {
      if (!slug) return
      setLoading(true)
      setError('')
      try {
        const response = await apiRequest<LandingPayload>(`/public/venues/${encodeURIComponent(slug)}/landing`)
        setLanding(response)
      } catch {
        setError('Venue link unavailable.')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [slug])

  async function handleJoin() {
    if (!token || !slug) {
      router.replace('/login')
      return
    }
    if (role === 'staff') {
      setError('Staff accounts cannot join customer loyalty cards.')
      return
    }

    setJoining(true)
    setError('')
    try {
      await apiRequest(`/venues/${encodeURIComponent(slug)}/join`, { method: 'POST', token })
      router.replace('/(customer)/wallet')
    } catch (exception) {
      setError(exception instanceof ApiError ? exception.message : 'Could not join venue.')
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: colors.bg, gap: 12 }}>
      <Text style={withAppFont({ marginTop: 24, fontSize: 28, fontWeight: '800' })}>
        {landing?.venue.name ?? 'Venue'}
      </Text>
      {landing?.venue.address ? <Text style={{ color: colors.inkMuted }}>{landing.venue.address}</Text> : null}
      <Text style={{ color: colors.inkMuted }}>Join this venue to collect stamps and claim rewards in-app.</Text>

      <View style={{ backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 14 }}>
        <Text style={withAppFont({ fontWeight: '700' })}>Milestones</Text>
        {landing?.milestones.slice(0, 4).map((milestone) => (
          <Text key={milestone.id} style={{ marginTop: 6, color: colors.inkMuted }}>
            🎁 {milestone.required_stamps} stamps - {milestone.title}
          </Text>
        ))}
      </View>

      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}

      <Pressable
        onPress={() => void handleJoin()}
        disabled={joining}
        style={{ backgroundColor: colors.primary, borderRadius: 999, paddingVertical: 12, alignItems: 'center', opacity: joining ? 0.6 : 1 }}
      >
        <Text style={withAppFont({ color: colors.primaryText, fontWeight: '800' })}>
          {joining ? 'Joining...' : token ? 'Join venue' : 'Login to join'}
        </Text>
      </Pressable>
    </View>
  )
}

