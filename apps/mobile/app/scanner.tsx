import { CameraView, type BarcodeScanningResult, useCameraPermissions } from 'expo-camera'
import * as SecureStore from 'expo-secure-store'
import { useEffect, useMemo, useState } from 'react'
import { FlatList, Pressable, Text, TextInput, View } from 'react-native'

import { ApiError, apiRequest } from '../src/lib/api'
import { useAuth } from '../src/providers/AuthProvider'

interface VenueSummary {
  id: number
  name: string
  membership_role?: 'owner' | 'staff' | null
}

interface VenueCustomer {
  id: number
  stamps: number
  user?: {
    name?: string | null
    email?: string | null
  } | null
}

interface StampScanResponse {
  scan_type: 'stamp'
  customer: {
    id: number
    stamps: number
    user?: { name?: string | null } | null
  }
  added_stamps?: number
  joined_on_scan?: boolean
}

interface RedeemScanResponse {
  scan_type: 'redeem'
  customer: {
    id: number
    user?: { name?: string | null } | null
  }
  reward: {
    id: number
    title: string
  }
}

type ScanResponse = StampScanResponse | RedeemScanResponse
const LAST_SCANNER_VENUE_KEY = 'flotory_mobile_last_scanner_venue'

export default function ScannerScreen() {
  const { token, role } = useAuth()
  const [permission, requestPermission] = useCameraPermissions()
  const [venues, setVenues] = useState<VenueSummary[]>([])
  const [selectedVenueId, setSelectedVenueId] = useState<number | null>(null)
  const [loadingVenues, setLoadingVenues] = useState(true)
  const [customers, setCustomers] = useState<VenueCustomer[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<VenueCustomer | null>(null)
  const [stamps, setStamps] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('Point camera at customer or claim QR.')
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [lastScan, setLastScan] = useState<{ value: string; at: number } | null>(null)

  const selectedVenue = useMemo(
    () => venues.find((venue) => venue.id === selectedVenueId) ?? null,
    [selectedVenueId, venues],
  )
  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return customers.slice(0, 6)
    return customers
      .filter((item) => {
        const name = item.user?.name?.toLowerCase() ?? ''
        const email = item.user?.email?.toLowerCase() ?? ''
        return name.includes(query) || email.includes(query)
      })
      .slice(0, 8)
  }, [customers, search])

  async function loadCustomers(venueId: number) {
    if (!token) return
    setLoadingCustomers(true)
    try {
      const response = await apiRequest<{ customers: VenueCustomer[] }>(`/venues/${venueId}/customers`, { token })
      setCustomers(response.customers)
    } catch {
      setCustomers([])
    } finally {
      setLoadingCustomers(false)
    }
  }

  useEffect(() => {
    async function loadVenues() {
      if (!token) return
      try {
        const response = await apiRequest<{ venues: VenueSummary[] }>('/venues', { token })
        const scannerVenues = response.venues.filter((venue) => venue.membership_role === 'owner' || venue.membership_role === 'staff')
        const storedVenueId = Number(await SecureStore.getItemAsync(LAST_SCANNER_VENUE_KEY) ?? '')
        const storedAvailable = scannerVenues.find((venue) => venue.id === storedVenueId)
        setVenues(scannerVenues)
        const firstVenueId = storedAvailable?.id ?? scannerVenues[0]?.id ?? null
        setSelectedVenueId(firstVenueId)
        if (firstVenueId) {
          await loadCustomers(firstVenueId)
        }
        setMessage(scannerVenues.length ? 'Point camera at customer or claim QR.' : 'No scanner venue access found.')
      } catch (exception) {
        setStatus('error')
        setMessage(exception instanceof ApiError ? exception.message : 'Could not load venues.')
      } finally {
        setLoadingVenues(false)
      }
    }

    void loadVenues()
  }, [token])

  useEffect(() => {
    if (!selectedVenueId) return
    void SecureStore.setItemAsync(LAST_SCANNER_VENUE_KEY, String(selectedVenueId))
    void loadCustomers(selectedVenueId)
  }, [selectedVenueId])

  async function handleScan(result: BarcodeScanningResult) {
    if (!token || !selectedVenueId || submitting) return
    const value = result.data?.trim()
    if (!value) return

    const now = Date.now()
    if (lastScan && lastScan.value === value && now - lastScan.at < 2000) {
      return
    }
    setLastScan({ value, at: now })

    setSubmitting(true)
    try {
      const response = await apiRequest<ScanResponse>(`/venues/${selectedVenueId}/scanner/scan`, {
        method: 'POST',
        token,
        body: { scan: value, stamps },
      })

      if (response.scan_type === 'redeem') {
        const customerName = response.customer.user?.name ?? 'Customer'
        setStatus('success')
        setMessage(`Redeemed ${response.reward.title} for ${customerName}.`)
      } else {
        const added = response.added_stamps ?? stamps
        const customerName = response.customer.user?.name ?? 'Customer'
        const venueLabel = selectedVenue?.name ?? 'this venue'
        setStatus('success')
        setMessage(
          response.joined_on_scan
            ? `Joined ${venueLabel} · +${added} ${added === 1 ? 'stamp' : 'stamps'} for ${customerName}.`
            : `+${added} ${added === 1 ? 'stamp' : 'stamps'} for ${customerName} at ${venueLabel}.`,
        )
      }
      setSelectedCustomer(null)
      setSearch('')
    } catch (exception) {
      setStatus('error')
      setMessage(exception instanceof ApiError ? exception.message : 'Scan failed.')
    } finally {
      setSubmitting(false)
    }
  }

  async function submitFallbackCustomer() {
    if (!selectedCustomer) {
      setStatus('error')
      setMessage('Select a customer first.')
      return
    }
    if (!selectedVenueId || !token) return
    setSubmitting(true)
    setStatus('idle')
    try {
      await apiRequest<StampScanResponse>(`/venues/${selectedVenueId}/scanner/stamps`, {
        method: 'POST',
        token,
        body: { customer_id: selectedCustomer.id, stamps },
      })
      const customerName = selectedCustomer.user?.name ?? 'Customer'
      const venueLabel = selectedVenue?.name ?? 'this venue'
      setStatus('success')
      setMessage(`+${stamps} ${stamps === 1 ? 'stamp' : 'stamps'} for ${customerName} at ${venueLabel}.`)
      setSelectedCustomer(null)
      setSearch('')
    } catch (exception) {
      setStatus('error')
      setMessage(exception instanceof ApiError ? exception.message : 'Could not add stamp.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!permission) {
    return <View style={{ flex: 1, backgroundColor: '#0f172a' }} />
  }

  if (!permission.granted) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 20, gap: 10, backgroundColor: '#f8fafc' }}>
        <Text style={{ fontSize: 22, fontWeight: '800' }}>Scanner permission needed</Text>
        <Text style={{ color: '#475569' }}>Allow camera to scan customer and claim QR codes.</Text>
        <Pressable
          onPress={requestPermission}
          style={{ backgroundColor: '#0f172a', borderRadius: 999, padding: 12, alignItems: 'center' }}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>Grant camera access</Text>
        </Pressable>
      </View>
    )
  }

  if (role !== 'owner' && role !== 'staff') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 20, gap: 10, backgroundColor: '#f8fafc' }}>
        <Text style={{ fontSize: 22, fontWeight: '800' }}>Staff scanner only</Text>
        <Text style={{ color: '#475569' }}>
          Your account does not have staff/owner scanner access for any venue.
        </Text>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#020617' }}>
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={loadingVenues || !selectedVenueId || submitting ? undefined : handleScan}
      />
      <View style={{ position: 'absolute', top: 18, left: 16, right: 16, backgroundColor: 'rgba(15,23,42,0.82)', borderRadius: 14, padding: 12 }}>
        <Text style={{ color: '#fff', fontWeight: '700' }}>
          {selectedVenue ? `Scanner · ${selectedVenue.name}` : 'Scanner'}
        </Text>
        <Text style={{ color: '#cbd5e1', marginTop: 3 }}>
          {loadingVenues ? 'Loading venues...' : message}
        </Text>
      </View>

      <View style={{ position: 'absolute', bottom: 22, left: 20, right: 20, backgroundColor: 'rgba(15,23,42,0.85)', borderRadius: 16, padding: 14, gap: 10 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {venues.map((venue) => (
            <Pressable
              key={venue.id}
              onPress={() => setSelectedVenueId(venue.id)}
              style={{
                backgroundColor: selectedVenueId === venue.id ? '#fff' : 'rgba(255,255,255,0.14)',
                borderRadius: 999,
                paddingVertical: 6,
                paddingHorizontal: 10,
              }}
            >
              <Text style={{ color: selectedVenueId === venue.id ? '#0f172a' : '#fff', fontWeight: '700', fontSize: 12 }}>
                {venue.name}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={{ color: '#e2e8f0', fontWeight: '700' }}>Stamps per scan</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[1, 2, 3, 4, 5].map((value) => (
            <Pressable
              key={value}
              onPress={() => setStamps(value)}
              style={{
                backgroundColor: stamps === value ? '#fff' : 'rgba(255,255,255,0.14)',
                borderRadius: 999,
                paddingVertical: 8,
                paddingHorizontal: 12,
              }}
            >
              <Text style={{ color: stamps === value ? '#0f172a' : '#fff', fontWeight: '800' }}>{value}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={{ color: status === 'error' ? '#fecaca' : '#cbd5e1', fontWeight: '600' }}>
          {submitting ? 'Processing scan...' : message}
        </Text>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Fallback: search customer by name/email"
          placeholderTextColor="#94a3b8"
          style={{
            marginTop: 2,
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.2)',
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            color: '#f8fafc',
          }}
        />
        <FlatList
          data={filteredCustomers}
          keyExtractor={(item) => String(item.id)}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
          ListEmptyComponent={
            <Text style={{ color: '#94a3b8', fontSize: 12 }}>
              {loadingCustomers ? 'Loading customers...' : 'No customers found'}
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setSelectedCustomer(item)}
              style={{
                backgroundColor: selectedCustomer?.id === item.id ? '#fff' : 'rgba(255,255,255,0.14)',
                borderRadius: 10,
                paddingVertical: 8,
                paddingHorizontal: 10,
                minWidth: 150,
              }}
            >
              <Text style={{ color: selectedCustomer?.id === item.id ? '#0f172a' : '#fff', fontWeight: '700' }}>
                {item.user?.name ?? 'Customer'}
              </Text>
              <Text style={{ color: selectedCustomer?.id === item.id ? '#334155' : '#cbd5e1', fontSize: 12 }}>
                {item.user?.email ?? 'No email'}
              </Text>
            </Pressable>
          )}
        />
        <Pressable
          disabled={!selectedCustomer || submitting}
          onPress={submitFallbackCustomer}
          style={{
            alignItems: 'center',
            borderRadius: 999,
            paddingVertical: 10,
            backgroundColor: !selectedCustomer || submitting ? 'rgba(148,163,184,0.3)' : '#fff',
          }}
        >
          <Text style={{ color: !selectedCustomer || submitting ? '#cbd5e1' : '#0f172a', fontWeight: '800' }}>
            Add stamp to selected customer
          </Text>
        </Pressable>
      </View>
    </View>
  )
}

