<script setup lang="ts">
import { Search, Users } from '@lucide/vue'
import { computed, onMounted, ref, watch } from 'vue'
import { QrcodeStream } from 'vue-qrcode-reader'
import { useRoute, useRouter } from 'vue-router'

import SuccessCheck from '@/components/loyalty/SuccessCheck.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import AppShell from '@/layouts/AppShell.vue'
import { api, ApiError, apiErrorMessage } from '@/lib/api'
import { rewardThumbUrl } from '@/lib/rewardMedia'
import { useWorkspaceStore } from '@/stores/workspace'
import type { Customer, Reward, Venue, Visit } from '@/types'

interface PendingClaimWarning {
  count: number
  message: string
  rewards: Array<{ id: number; title: string }>
}

interface StampScanResponse {
  scan_type: 'stamp'
  customer: Customer
  previous_stamps?: number
  added_stamps?: number
  next_reward: Reward | null
  available_rewards: Reward[]
  recent_visits?: Visit[]
  pending_claim_warning?: PendingClaimWarning | null
}

interface RedeemScanResponse {
  scan_type: 'redeem'
  customer: Customer
  reward: Reward
  next_reward: Reward | null
  available_rewards: Reward[]
}

type ScanResponse = StampScanResponse | RedeemScanResponse
type LastScanKind = 'stamp' | 'redeem'
type CustomerWithVisits = Customer & { visits_count?: number }

const router = useRouter()
const route = useRoute()
const workspace = useWorkspaceStore()
const rawScan = ref('')
const scanning = ref(true)
const status = ref<'idle' | 'processing' | 'success' | 'error'>('idle')
const lastScanKind = ref<LastScanKind | null>(null)
const venue = ref<Venue | null>(null)
const customer = ref<Customer | null>(null)
const redeemedReward = ref<Reward | null>(null)
const customers = ref<CustomerWithVisits[]>([])
const customerSearch = ref('')
const selectedCustomer = ref<CustomerWithVisits | null>(null)
const message = ref('')
const loading = ref(false)
const submitting = ref(false)
const customerLoading = ref(false)
const customerLoadError = ref('')
const pendingClaimWarning = ref<PendingClaimWarning | null>(null)
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
  if (status.value === 'processing') {
    return lastScanKind.value === 'redeem' ? 'Redeeming reward…' : 'Adding stamp…'
  }

  if (status.value === 'success') {
    return message.value || (lastScanKind.value === 'redeem' ? 'Reward redeemed.' : 'Stamp added.')
  }

  if (status.value === 'error') {
    return message.value || 'Scan failed. Try again.'
  }

  return 'Point camera at stamp card or reward claim QR'
})

const isBusy = computed(() =>
  submitting.value ||
  loading.value ||
  status.value === 'processing' ||
  status.value === 'success',
)

const showStampControls = computed(() => lastScanKind.value !== 'redeem')

const scannerVenueId = computed(() => {
  const venueId = route.query.venue_id

  return typeof venueId === 'string' ? Number(venueId) : null
})

function applyCustomerResponse(response: ScanResponse) {
  customer.value = response.customer
  customers.value = customers.value.map((item) =>
    item.id === response.customer.id ? { ...item, ...response.customer } : item,
  )
}

function handleDetect(codes: Array<{ rawValue: string }>) {
  const value = codes[0]?.rawValue
  if (!value || isBusy.value || status.value !== 'idle') return

  selectedCustomer.value = null
  customerSearch.value = ''
  rawScan.value = value
  void processScan(value)
}

function selectPresetAmount(amount: number) {
  selectedPresetStamps.value = amount
  useCustomStamps.value = false
}

async function loadRestaurant() {
  await workspace.bootstrap()
  const venues = (await api<{ venues: Venue[] }>('/venues')).venues
  const venueId = scannerVenueId.value ?? workspace.effectiveVenueId
  venue.value = venueId ? (venues.find((item) => item.id === venueId) ?? null) : null

  if (!venue.value) {
    await router.push('/onboarding')

    return
  }

  await loadCustomers()
}

async function loadCustomers() {
  if (!venue.value) return

  customerLoading.value = true
  customerLoadError.value = ''

  try {
    customers.value = (await api<{ customers: CustomerWithVisits[] }>(`/venues/${venue.value.id}/customers`)).customers
  } catch (exception) {
    customerLoadError.value = apiErrorMessage(exception, 'Could not load customers.')
  } finally {
    customerLoading.value = false
  }
}

function selectCustomerForFallback(item: CustomerWithVisits) {
  selectedCustomer.value = item
  rawScan.value = ''
}

function clearSelectedCustomer() {
  selectedCustomer.value = null
}

async function processScan(scanValue: string) {
  if (submitting.value || !venue.value) {
    return
  }

  submitting.value = true
  loading.value = true
  scanning.value = false
  status.value = 'processing'
  message.value = ''
  pendingClaimWarning.value = null
  redeemedReward.value = null

  try {
    const response = await api<ScanResponse>(`/venues/${venue.value.id}/scanner/scan`, {
      method: 'POST',
      body: {
        scan: scanValue,
        stamps: selectedStampAmount.value,
      },
    })

    applyCustomerResponse(response)
    selectedCustomer.value = null
    customerSearch.value = ''
    rawScan.value = ''
    status.value = 'success'

    if (response.scan_type === 'redeem') {
      lastScanKind.value = 'redeem'
      redeemedReward.value = response.reward
      const customerName = response.customer.user?.name ?? 'Customer'
      message.value = `Reward redeemed for ${customerName}: ${response.reward.title}.`
      scheduleReset(2800)
    } else {
      lastScanKind.value = 'stamp'
      pendingClaimWarning.value = response.pending_claim_warning ?? null
      const addedStamps = response.added_stamps ?? selectedStampAmount.value
      const stampLabel = addedStamps === 1 ? 'stamp' : 'stamps'
      const customerName = response.customer.user?.name ?? 'Customer'
      message.value = `${addedStamps} ${stampLabel} added for ${customerName}.`
      const delay = pendingClaimWarning.value ? 4500 : response.available_rewards.length ? 2300 : 1700
      scheduleReset(delay)
    }
  } catch (exception) {
    status.value = 'error'
    message.value = exception instanceof ApiError ? exception.message : 'Scan failed.'
    scheduleReset(3200)
  } finally {
    loading.value = false
    submitting.value = false
  }
}

async function addStampFromFallback() {
  const qrToken = selectedCustomer.value?.qr_token

  if (!qrToken) {
    status.value = 'error'
    scanning.value = false
    message.value = 'Select a customer first.'

    return
  }

  await processScan(qrToken)
}

function scheduleReset(delay: number) {
  window.clearTimeout(resetTimer)
  resetTimer = window.setTimeout(resetScanner, delay)
}

function resetScanner() {
  window.clearTimeout(resetTimer)
  rawScan.value = ''
  customer.value = null
  redeemedReward.value = null
  selectedCustomer.value = null
  customerSearch.value = ''
  message.value = ''
  pendingClaimWarning.value = null
  lastScanKind.value = null
  status.value = 'idle'
  scanning.value = true
  submitting.value = false
  loading.value = false
}

function dismissWarningAndReset() {
  pendingClaimWarning.value = null
  resetScanner()
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
        <p class="mt-2 text-slate-500">
          {{
            venue
              ? `At ${venue.name}: stamp card QR adds stamps. Amber claim QR redeems a reward.`
              : 'Designed for a sub-3-second cashier flow.'
          }}
        </p>
        <p class="mt-1 text-xs font-semibold text-amber-700">
          For rewards, the customer must tap Claim in Rewards — not show their stamp card.
        </p>
      </div>

      <AppCard wrapper-class="overflow-hidden p-0">
        <div class="relative aspect-square bg-slate-950">
          <QrcodeStream v-if="scanning" class="h-full w-full object-cover" @detect="handleDetect" />
          <div
            v-else-if="status === 'processing'"
            class="grid h-full place-items-center text-white"
            :class="lastScanKind === 'redeem' ? 'bg-amber-950' : 'bg-slate-950'"
          >
            <div class="text-center">
              <div class="mx-auto size-16 animate-spin rounded-full border-4 border-white/20 border-t-white" />
              <p class="mt-5 text-xl font-black">
                {{ lastScanKind === 'redeem' ? 'Redeeming reward' : 'Adding stamp' }}
              </p>
              <p class="text-sm font-semibold text-white/60">Please keep this screen open</p>
            </div>
          </div>
          <div v-else-if="status === 'error'" class="grid h-full place-items-center bg-gradient-to-br from-red-500 to-slate-950 text-white">
            <div class="px-6 text-center">
              <div class="mx-auto grid size-20 place-items-center rounded-full bg-white/20 text-5xl font-black">!</div>
              <p class="mt-5 text-2xl font-black">Scan failed</p>
              <p class="mt-2 text-sm font-semibold text-red-50">{{ message }}</p>
              <p class="mt-3 text-xs font-bold uppercase tracking-wide text-white/60">Resetting scanner…</p>
            </div>
          </div>
          <div
            v-else
            class="grid h-full place-items-center text-white"
            :class="lastScanKind === 'redeem' ? 'bg-gradient-to-br from-amber-500 to-amber-950' : 'bg-gradient-to-br from-emerald-500 to-slate-950'"
          >
            <div class="px-6 text-center">
              <SuccessCheck />
              <p class="mt-5 text-2xl font-black">
                {{ lastScanKind === 'redeem' ? 'Reward redeemed' : 'Stamp added' }}
              </p>
              <p class="text-sm font-semibold opacity-90">{{ customer?.user?.name ?? 'Customer' }}</p>
              <p v-if="lastScanKind === 'redeem' && redeemedReward" class="mt-2 text-base font-black">
                {{ redeemedReward.title }}
              </p>
              <p v-else class="opacity-90">{{ customer?.stamps ?? 0 }} active stamps</p>
            </div>
          </div>
          <div class="absolute inset-x-6 top-6 rounded-3xl bg-white/90 p-4 text-center shadow-xl backdrop-blur">
            <p class="text-sm font-black text-slate-950">{{ statusLabel }}</p>
          </div>
        </div>

        <div
          v-if="status === 'success' && pendingClaimWarning"
          class="border-b border-amber-200 bg-amber-50 px-5 py-4"
        >
          <p class="text-sm font-black text-amber-950">Reward ready to claim</p>
          <p class="mt-1 text-sm font-semibold text-amber-900">{{ pendingClaimWarning.message }}</p>
          <ul v-if="pendingClaimWarning.rewards.length" class="mt-2 space-y-1 text-sm text-amber-800">
            <li v-for="reward in pendingClaimWarning.rewards" :key="reward.id">• {{ reward.title }}</li>
          </ul>
          <div class="mt-3 flex gap-2">
            <AppButton class="flex-1" size="sm" variant="secondary" @click="dismissWarningAndReset">
              Got it — scan next
            </AppButton>
          </div>
        </div>

        <div v-if="showStampControls" class="space-y-5 p-5">
          <div>
            <p class="text-sm font-black text-slate-950">Stamps to add</p>
            <p class="text-xs font-semibold text-slate-500">Only when scanning the customer loyalty card.</p>
            <div class="mt-3 grid grid-cols-5 gap-2">
              <button
                v-for="amount in [1, 2, 3, 4, 5]"
                :key="amount"
                type="button"
                :disabled="isBusy"
                :class="[
                  'h-11 rounded-2xl text-sm font-black transition',
                  !useCustomStamps && selectedPresetStamps === amount ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                  isBusy ? 'cursor-not-allowed opacity-50' : '',
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
              :disabled="isBusy"
              class="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none transition focus:border-slate-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Custom stamps"
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
              :disabled="isBusy"
              class="mt-3 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Search by name or email"
            >

            <div v-if="selectedCustomer" class="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-emerald-50 p-3 ring-1 ring-emerald-100">
              <div>
                <p class="font-black text-emerald-950">{{ selectedCustomer.user?.name ?? 'Customer' }}</p>
                <p class="text-sm font-semibold text-emerald-700">{{ selectedCustomer.stamps }} current stamps</p>
              </div>
              <button type="button" class="text-sm font-black text-emerald-700" @click="clearSelectedCustomer">
                Clear
              </button>
            </div>

            <div v-else class="mt-3 space-y-2">
              <p v-if="customerLoadError" class="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700 ring-1 ring-red-100">
                {{ customerLoadError }}
                <button type="button" class="ml-2 font-black underline" @click="loadCustomers">Retry</button>
              </p>
              <button
                v-for="item in filteredCustomers"
                :key="item.id"
                type="button"
                :disabled="isBusy"
                class="flex w-full items-center justify-between gap-3 rounded-2xl bg-white p-3 text-left ring-1 ring-slate-200 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                @click="selectCustomerForFallback(item)"
              >
                <span>
                  <span class="block font-black text-slate-950">{{ item.user?.name ?? 'Customer' }}</span>
                  <span class="block text-sm font-semibold text-slate-500">{{ item.user?.email }}</span>
                </span>
                <span class="text-sm font-black text-slate-500">{{ item.stamps }} stamps</span>
              </button>
              <EmptyState
                v-if="!customerLoading && !customerLoadError && !filteredCustomers.length"
                bare
                compact
                bordered
                :icon="customerSearch.trim() ? Search : Users"
                :title="customerSearch.trim() ? 'No matching customers' : 'No customers yet'"
                :description="customerSearch.trim() ? 'Try a different name or email.' : 'Customers appear here after their first stamp scan.'"
              />
            </div>
          </div>

          <AppButton class="w-full" size="lg" :disabled="isBusy || !selectedCustomer" @click="addStampFromFallback">
            {{ isBusy ? 'Adding stamps...' : `Add ${selectedStampAmount} ${selectedStampAmount === 1 ? 'stamp' : 'stamps'}` }}
          </AppButton>
          <AppButton v-if="status === 'error'" class="w-full" variant="secondary" @click="resetScanner">
            Scan another QR
          </AppButton>
        </div>

        <div v-else-if="status === 'success' && !pendingClaimWarning" class="p-5">
          <div v-if="redeemedReward" class="mb-4 flex items-center gap-3 rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-200">
            <img :src="rewardThumbUrl(redeemedReward)" alt="" class="size-12 rounded-xl object-cover">
            <div>
              <p class="font-black text-amber-950">{{ redeemedReward.title }}</p>
              <p class="text-sm font-semibold text-amber-800">Marked as used</p>
            </div>
          </div>
          <AppButton class="w-full" variant="secondary" @click="resetScanner">
            Scan next customer
          </AppButton>
        </div>
      </AppCard>
    </div>
  </AppShell>
</template>
