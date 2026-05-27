<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { QrcodeStream } from 'vue-qrcode-reader'
import { useRoute, useRouter } from 'vue-router'

import SuccessCheck from '@/components/loyalty/SuccessCheck.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppShell from '@/layouts/AppShell.vue'
import { api, ApiError } from '@/lib/api'
import type { Customer, Reward, Venue, Visit } from '@/types'

interface ScanResponse {
  customer: Customer
  previous_stamps?: number
  added_stamps?: number
  next_reward: Reward | null
  available_rewards: Reward[]
  recent_visits?: Visit[]
}

type CustomerWithVisits = Customer & { visits_count?: number }

const router = useRouter()
const route = useRoute()
const token = ref('')
const scanning = ref(true)
const status = ref<'idle' | 'processing' | 'success' | 'error'>('idle')
const venue = ref<Venue | null>(null)
const customer = ref<Customer | null>(null)
const customers = ref<CustomerWithVisits[]>([])
const customerSearch = ref('')
const selectedCustomer = ref<CustomerWithVisits | null>(null)
const message = ref('')
const loading = ref(false)
const customerLoading = ref(false)
const selectedPresetStamps = ref(1)
const customStamps = ref(1)
const useCustomStamps = ref(false)
let resetTimer: number | undefined

const selectedStampAmount = computed(() => {
  const amount = useCustomStamps.value ? customStamps.value : selectedPresetStamps.value

  return Math.min(Math.max(Number(amount) || 1, 1), 100)
})

const filteredCustomers = computed(() => {
  const query = customerSearch.value.trim().toLowerCase()

  if (!query) {
    return customers.value.slice(0, 5)
  }

  return customers.value
    .filter((item) => {
      const name = item.user?.name?.toLowerCase() ?? ''
      const email = item.user?.email?.toLowerCase() ?? ''

      return name.includes(query) || email.includes(query)
    })
    .slice(0, 8)
})

const statusLabel = computed(() => {
  if (status.value === 'processing') return 'Adding stamp...'
  if (status.value === 'success') return message.value || 'Stamp added.'
  if (status.value === 'error') return message.value || 'Scan failed. Try again.'
  return 'Point camera at customer loyalty QR'
})
const scannerVenueId = computed(() => {
  const venueId = route.query.venue_id

  return typeof venueId === 'string' ? Number(venueId) : null
})

function applyScanResponse(response: ScanResponse) {
  customer.value = response.customer
  customers.value = customers.value.map((item) => (item.id === response.customer.id ? { ...item, ...response.customer } : item))
}

function handleDetect(codes: Array<{ rawValue: string }>) {
  const value = codes[0]?.rawValue
  if (!value || loading.value || status.value !== 'idle') return

  selectedCustomer.value = null
  token.value = value
  addStamp()
}

function selectPresetAmount(amount: number) {
  selectedPresetStamps.value = amount
  useCustomStamps.value = false
}

async function loadRestaurant() {
  if (scannerVenueId.value) {
    const venues = (await api<{ venues: Venue[] }>('/venues')).venues
    venue.value = venues.find((item) => item.id === scannerVenueId.value) ?? null
  } else {
    venue.value = (await api<{ venue: Venue | null }>('/venues/current')).venue
  }

  if (!venue.value) {
    await router.push('/onboarding')
    return
  }

  await loadCustomers()
}

async function loadCustomers() {
  if (!venue.value) return

  customerLoading.value = true

  try {
    customers.value = (await api<{ customers: CustomerWithVisits[] }>(`/venues/${venue.value.id}/customers`)).customers
  } finally {
    customerLoading.value = false
  }
}

function selectCustomerForFallback(item: CustomerWithVisits) {
  selectedCustomer.value = item
  token.value = ''
}

function clearSelectedCustomer() {
  selectedCustomer.value = null
}

async function addStamp() {
  const qrToken = selectedCustomer.value?.qr_token || token.value

  if (!qrToken || !venue.value) {
    status.value = 'error'
    message.value = 'Scan a QR or select a customer first.'
    return
  }

  loading.value = true
  scanning.value = false
  status.value = 'processing'
  message.value = ''

  try {
    const response = await api<ScanResponse>(`/venues/${venue.value.id}/scanner/stamps`, {
      method: 'POST',
      body: {
        qr_token: qrToken,
        stamps: selectedStampAmount.value,
      },
    })

    applyScanResponse(response)
    status.value = 'success'
    const addedStamps = response.added_stamps ?? selectedStampAmount.value
    const starLabel = addedStamps === 1 ? 'star' : 'stars'
    message.value = response.available_rewards.length
      ? `${addedStamps} ${starLabel} added. ${response.customer.user?.name ?? 'Customer'} now has ${response.customer.stamps} stamps. Reward is unlocked.`
      : `${addedStamps} ${starLabel} added. ${response.customer.user?.name ?? 'Customer'} now has ${response.customer.stamps} stamps.`
    scheduleReset(response.available_rewards.length ? 2300 : 1700)
  } catch (exception) {
    status.value = 'error'
    message.value = exception instanceof ApiError ? exception.message : 'Could not add stamp.'
    scheduleReset(2600)
  } finally {
    loading.value = false
  }
}

function scheduleReset(delay: number) {
  window.clearTimeout(resetTimer)
  resetTimer = window.setTimeout(resetScanner, delay)
}

function resetScanner() {
  window.clearTimeout(resetTimer)
  token.value = ''
  customer.value = null
  selectedCustomer.value = null
  message.value = ''
  status.value = 'idle'
  scanning.value = true
}

onMounted(loadRestaurant)

watch(scannerVenueId, () => {
  resetScanner()
  loadRestaurant()
})
</script>

<template>
  <AppShell>
    <div class="mx-auto max-w-2xl">
      <div class="mb-5">
        <AppBadge tone="green">Staff scanner</AppBadge>
        <h1 class="mt-3 text-4xl font-black tracking-tight text-slate-950">Scan loyalty QR</h1>
        <p class="mt-2 text-slate-500">{{ venue ? `Add loyalty stars at ${venue.name}. Customers redeem rewards from their account.` : 'Designed for a sub-3-second cashier flow.' }}</p>
      </div>

      <AppCard wrapper-class="overflow-hidden p-0">
        <div class="relative aspect-square bg-slate-950">
          <QrcodeStream v-if="scanning" class="h-full w-full object-cover" @detect="handleDetect" />
          <div v-else-if="status === 'processing'" class="grid h-full place-items-center bg-slate-950 text-white">
            <div class="text-center">
              <div class="mx-auto size-16 animate-spin rounded-full border-4 border-white/20 border-t-white" />
              <p class="mt-5 text-xl font-black">Adding stamp</p>
              <p class="text-sm font-semibold text-white/60">Please keep this screen open</p>
            </div>
          </div>
          <div v-else-if="status === 'error'" class="grid h-full place-items-center bg-gradient-to-br from-red-500 to-slate-950 text-white">
            <div class="px-6 text-center">
              <div class="mx-auto grid size-20 place-items-center rounded-full bg-white/20 text-5xl font-black">!</div>
              <p class="mt-5 text-2xl font-black">Scan not added</p>
              <p class="mt-2 text-sm font-semibold text-red-50">{{ message }}</p>
              <p class="mt-3 text-xs font-bold uppercase tracking-wide text-white/60">Resetting scanner...</p>
            </div>
          </div>
          <div v-else class="grid h-full place-items-center bg-gradient-to-br from-emerald-500 to-slate-950 text-white">
            <div class="px-6 text-center">
              <SuccessCheck />
              <p class="mt-5 text-2xl font-black">Stamp added</p>
              <p class="text-emerald-50">{{ customer?.user?.name ?? 'Customer found' }}</p>
              <p class="text-emerald-50">{{ customer?.stamps ?? 0 }} active stamps</p>
            </div>
          </div>
          <div class="absolute inset-x-6 top-6 rounded-3xl bg-white/90 p-4 text-center shadow-xl backdrop-blur">
            <p class="text-sm font-black text-slate-950">{{ statusLabel }}</p>
          </div>
        </div>

        <div class="space-y-5 p-5">
          <div>
            <p class="text-sm font-black text-slate-950">Stars to add</p>
            <div class="mt-3 grid grid-cols-5 gap-2">
              <button
                v-for="amount in [1, 2, 3, 4, 5]"
                :key="amount"
                type="button"
                :class="[
                  'h-11 rounded-2xl text-sm font-black transition',
                  !useCustomStamps && selectedPresetStamps === amount ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                ]"
                @click="selectPresetAmount(amount)"
              >
                {{ amount }}
              </button>
            </div>
            <label class="mt-3 block text-sm font-bold text-slate-600" for="custom-stamps">Custom amount</label>
            <input
              id="custom-stamps"
              v-model.number="customStamps"
              min="1"
              max="100"
              type="number"
              class="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none transition focus:border-slate-400 focus:bg-white"
              placeholder="Custom stars"
              @focus="useCustomStamps = true"
            >
          </div>

          <div class="rounded-[1.5rem] bg-slate-50 p-4 ring-1 ring-slate-200">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-sm font-black text-slate-950">Customer fallback</p>
                <p class="text-xs font-semibold text-slate-500">Use this if camera scanning fails.</p>
              </div>
              <AppBadge>{{ customerLoading ? 'Loading' : `${customers.length} cards` }}</AppBadge>
            </div>

            <input
              v-model="customerSearch"
              class="mt-3 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium outline-none transition focus:border-slate-400"
              placeholder="Search by name or email"
            >

            <div v-if="selectedCustomer" class="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-emerald-50 p-3 ring-1 ring-emerald-100">
              <div>
                <p class="font-black text-emerald-950">{{ selectedCustomer.user?.name ?? 'Customer' }}</p>
                <p class="text-sm font-semibold text-emerald-700">{{ selectedCustomer.stamps }} current stars</p>
              </div>
              <button type="button" class="text-sm font-black text-emerald-700" @click="clearSelectedCustomer">
                Clear
              </button>
            </div>

            <div v-else class="mt-3 space-y-2">
              <button
                v-for="item in filteredCustomers"
                :key="item.id"
                type="button"
                class="flex w-full items-center justify-between gap-3 rounded-2xl bg-white p-3 text-left ring-1 ring-slate-200 transition hover:bg-slate-100"
                @click="selectCustomerForFallback(item)"
              >
                <span>
                  <span class="block font-black text-slate-950">{{ item.user?.name ?? 'Customer' }}</span>
                  <span class="block text-sm font-semibold text-slate-500">{{ item.user?.email }}</span>
                </span>
                <span class="text-sm font-black text-slate-500">{{ item.stamps }} stars</span>
              </button>
              <p v-if="!customerLoading && !filteredCustomers.length" class="rounded-2xl bg-white p-3 text-sm font-bold text-slate-500">
                No matching customers.
              </p>
            </div>
          </div>

          <AppButton class="w-full" size="lg" :disabled="loading || !selectedCustomer" @click="addStamp">
            {{ loading ? 'Adding stars...' : `Add ${selectedStampAmount} ${selectedStampAmount === 1 ? 'star' : 'stars'}` }}
          </AppButton>
          <AppButton v-if="status === 'error'" class="w-full" variant="secondary" @click="resetScanner">
            Scan another customer
          </AppButton>
        </div>
      </AppCard>

    </div>
  </AppShell>
</template>
