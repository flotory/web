import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, ScrollView, Text, View } from 'react-native'

import { apiRequest } from '../src/lib/api'
import { useAuth } from '../src/providers/AuthProvider'
import { withAppFont } from '../src/lib/typography'
import { colors, radius, shadows, space } from '../src/theme'

interface DashboardPayload {
  venue?: {
    id: number
    name: string
  } | null
  stats: {
    total_customers: number
    visits_last_28_days?: number
    milestones_unlocked?: number
    returning_customers?: number
  }
  insights?: Array<{ text: string }>
}

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <View
      style={{
        width: '47%',
        backgroundColor: colors.surface,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 14,
        ...shadows.sm,
      }}
    >
      <Text style={withAppFont({ color: colors.inkMuted, fontWeight: '700', fontSize: 12 })}>{label}</Text>
      <Text style={withAppFont({ marginTop: 6, fontSize: 28, fontWeight: '800', color: colors.ink })}>{value}</Text>
    </View>
  )
}

export default function OwnerDashboardScreen() {
  const { token, role } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null)

  const kpis = useMemo(() => {
    if (!dashboard) return []
    return [
      { label: 'Visits (last 28 days)', value: dashboard.stats.visits_last_28_days ?? 0 },
      { label: 'Returning guests (28 days)', value: dashboard.stats.returning_customers ?? 0 },
      { label: 'Rewards unlocked', value: dashboard.stats.milestones_unlocked ?? 0 },
      { label: 'Customers', value: dashboard.stats.total_customers ?? 0 },
    ]
  }, [dashboard])

  useEffect(() => {
    async function load() {
      if (!token) return
      setLoading(true)
      setError('')
      try {
        const response = await apiRequest<DashboardPayload>('/dashboard', { token })
        setDashboard(response)
      } catch {
        setError('Could not load owner dashboard.')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [token])

  if (role !== 'owner') {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: space.screenX,
          backgroundColor: colors.bg,
        }}
      >
        <Text style={withAppFont({ fontWeight: '700', color: colors.ink })}>Owner dashboard unavailable.</Text>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    )
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: space.screenX, gap: 12, paddingBottom: 32 }}
    >
      <Text style={withAppFont({ fontSize: 28, fontWeight: '800', marginTop: 12, color: colors.ink })}>
        {dashboard?.venue?.name ?? 'Owner Dashboard'}
      </Text>
      {error ? <Text style={withAppFont({ color: colors.danger, fontWeight: '600' })}>{error}</Text> : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} label={kpi.label} value={kpi.value} />
        ))}
      </View>

      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: radius.card,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 14,
          ...shadows.sm,
        }}
      >
        <Text style={withAppFont({ fontSize: 16, fontWeight: '800', color: colors.ink })}>Insights</Text>
        {(dashboard?.insights ?? []).slice(0, 5).map((insight, index) => (
          <Text
            key={`${insight.text}-${index}`}
            style={withAppFont({ marginTop: 8, color: colors.inkMuted, lineHeight: 20 })}
          >
            • {insight.text}
          </Text>
        ))}
        {(dashboard?.insights ?? []).length === 0 ? (
          <Text style={withAppFont({ marginTop: 8, color: colors.inkSoft })}>Insights appear after activity.</Text>
        ) : null}
      </View>
    </ScrollView>
  )
}
