import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, ScrollView, Text, View } from 'react-native'

import { apiRequest } from '../src/lib/api'
import { useAuth } from '../src/providers/AuthProvider'
import { withAppFont } from '../src/lib/typography'

interface DashboardPayload {
  venue?: {
    id: number
    name: string
  } | null
  stats: {
    total_customers: number
    visits_this_month?: number
    milestones_unlocked?: number
    returning_customers?: number
  }
  insights?: Array<{ text: string }>
}

export default function OwnerDashboardScreen() {
  const { token, role } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null)

  const kpis = useMemo(() => {
    if (!dashboard) return []
    return [
      { label: 'Visits this month', value: dashboard.stats.visits_this_month ?? 0 },
      { label: 'Returning guests', value: dashboard.stats.returning_customers ?? 0 },
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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#f8fafc' }}>
        <Text style={withAppFont({ fontWeight: '700' })}>Owner dashboard unavailable.</Text>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    )
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f8fafc' }} contentContainerStyle={{ padding: 20, gap: 12 }}>
      <Text style={withAppFont({ fontSize: 28, fontWeight: '800', marginTop: 12 })}>
        {dashboard?.venue?.name ?? 'Owner Dashboard'}
      </Text>
      {error ? <Text style={{ color: '#b91c1c' }}>{error}</Text> : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {kpis.map((kpi) => (
          <View key={kpi.label} style={{ width: '47%', backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', padding: 14 }}>
            <Text style={withAppFont({ color: '#64748b', fontWeight: '700', fontSize: 12 })}>{kpi.label}</Text>
            <Text style={withAppFont({ marginTop: 6, fontSize: 28, fontWeight: '800' })}>{kpi.value}</Text>
          </View>
        ))}
      </View>

      <View style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', padding: 14 }}>
        <Text style={withAppFont({ fontSize: 16, fontWeight: '800' })}>Insights</Text>
        {(dashboard?.insights ?? []).slice(0, 5).map((insight, index) => (
          <Text key={`${insight.text}-${index}`} style={{ marginTop: 8, color: '#334155' }}>
            • {insight.text}
          </Text>
        ))}
        {(dashboard?.insights ?? []).length === 0 ? (
          <Text style={{ marginTop: 8, color: '#64748b' }}>Insights appear after activity.</Text>
        ) : null}
      </View>
    </ScrollView>
  )
}

