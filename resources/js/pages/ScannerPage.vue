<script setup lang="ts">
import { Search, Users } from '@lucide/vue'
import { computed, onMounted, ref, watch } from 'vue'
import { QrcodeStream } from 'vue-qrcode-reader'
import { useRoute, useRouter } from 'vue-router'

import SuccessCheck from '@/components/loyalty/SuccessCheck.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import AppShell from '@/layouts/AppShell.vue'
import { api, apiErrorMessage } from '@/lib/api'
import { scanErrorView, type ScanErrorView } from '@/lib/scanError'
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
const scanError = ref<ScanErrorView | null>(null)
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
    return scanError.value?.detail || message.value || 'Scan failed. Try again.'
  }

  return 'Point camera at stamp card or reward claim QR'
})

const isBusy = computed(() =>
  submitting.value ||
  loading.value ||
  status.value === 'processing' ||
  status.value === 'success',
)

const showStampControls = computed(
  () => status.value === 'idle' || status.value === 'error' || lastScanKind.value !== 'redeem',
)

const canUseFallback = computed(
  () => Boolean(selectedCustomer.value?.id && venue.value && !submitting.value && !loading.value),
)

const scannerVenueId = computed(() => {
  const venueId = route.query.venue_id

  return typeof venueId === 'string' ? Number(venueId) : null
})

/** Left-menu venue filter wins over a stale `?venue_id=` in the URL. */
const activeScannerVenueId = computed(
  () => workspace.effectiveVenueId ?? scannerVenueId.value,
)

function applyCustomerResponse(response: ScanResponse) {
  customer.value = response.customer
  customers.value = customers.value.map((item) =>
    item.id === response.customer.id ? { ...item, ...response.customer } : item,
  )
}

function isPlausibleScan(value: string): boolean {
  const trimmed = value.trim()

  return trimmed.startsWith('flotory:') || trimmed.length >= 12
}

function handleDetect(codes: Array<{ rawValue: string }>) {
  const value = codes[0]?.rawValue?.trim()
  if (!value || !isPlausibleScan(value) || isBusy.value || status.value !== 'idle') {
    return
  }

  if (!venue.value) {
    showLocalScanError('Choose a venue in the sidebar, then try again.')
    return
  }

  selectedCustomer.value = null
  customerSearch.value = ''
  rawScan.value = value
  void processScan(value)
}

function selectPresetAmount(amount: number) {
  selectedPresetStamps.value = amount
  useCustomStamps.value = false
}

async function syncScannerVenueQuery(venueId: number) {
  if (scannerVenueId.value === venueId) {
    return
  }

  await router.replace({ name: 'scanner', query: { venue_id: String(venueId) } })
}

async function loadRestaurant() {
  await workspace.bootstrap()
  const venues = (await api<{ venues: Venue[] }>('/venues')).venues
  const venueId = activeScannerVenueId.value
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

function finishScanResponse(response: ScanResponse) {
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
    return
  }

  lastScanKind.value = 'stamp'
  pendingClaimWarning.value = response.pending_claim_warning ?? null
  const addedStamps = response.added_stamps ?? selectedStampAmount.value
  const stampLabel = addedStamps === 1 ? 'stamp' : 'stamps'
  const customerName = response.customer.user?.name ?? 'Customer'
  message.value = `${addedStamps} ${stampLabel} added for ${customerName}.`
  const delay = pendingClaimWarning.value ? 4500 : response.available_rewards.length ? 2300 : 1700
  scheduleReset(delay)
}

function beginScanRequest() {
  submitting.value = true
  loading.value = true
  scanning.value = false
  status.value = 'processing'
  message.value = ''
  scanError.value = null
  pendingClaimWarning.value = null
  redeemedReward.value = null
}

function showLocalScanError(text: string, autoResetMs = 3200, title = 'Scan failed') {
  window.clearTimeout(resetTimer)
  status.value = 'error'
  scanning.value = false
  submitting.value = false
  loading.value = false
  scanError.value = { title, detail: text }
  message.value = text
  if (autoResetMs > 0) {
    scheduleReset(autoResetMs)
  }
}

function failScanRequest(exception: unknown) {
  const view = scanErrorView(exception, { lastScanKind: lastScanKind.value })
  window.clearTimeout(resetTimer)
  status.value = 'error'
  scanning.value = false
  submitting.value = false
  loading.value = false
  scanError.value = view
  message.value = view.detail
  scheduleReset(4200)
}

async function processScan(scanValue: string) {
  if (submitting.value) {
    return
  }

  if (!venue.value) {
    showLocalScanError('Choose a venue in the sidebar, then scan again.')
    return
  }

  lastScanKind.value = scanValue.includes('flotory:redeem') ? 'redeem' : 'stamp'
  beginScanRequest()

  try {
    const response = await api<ScanResponse>(`/venues/${venue.value.id}/scanner/scan`, {
      method: 'POST',
      body: {
        scan: scanValue,
        stamps: selectedStampAmount.value,
      },
    })

    finishScanResponse(response)
  } catch (exception) {
    failScanRequest(exception)
  } finally {
    loading.value = false
    submitting.value = false
  }
}

async function addStampFromFallback() {
  if (submitting.value) {
    return
  }

  if (!venue.value) {
    showLocalScanError('Choose a venue in the sidebar first.')
    return
  }

  const customerId = selectedCustomer.value?.id
  if (!customerId) {
    showLocalScanError('Tap a customer in the list below, then add stamps.')
    return
  }

  beginScanRequest()

  try {
    const response = await api<StampScanResponse>(`/venues/${venue.value.id}/scanner/stamps`, {
      method: 'POST',
      body: {
        customer_id: customerId,
        stamps: selectedStampAmount.value,
      },
    })

    finishScanResponse(response)
  } catch (exception) {
    failScanRequest(exception)
  } finally {
    loading.value = false
    submitting.value = false
  }
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
  scanError.value = null
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

async function reloadScannerForVenue(venueId: number | null) {
  if (venueId == null) {
    return
  }

  await syncScannerVenueQuery(venueId)
  resetScanner()
  await loadRestaurant()
}

async function ensureScannerVenueLoaded() {
  await workspace.bootstrap()
  const venueId = activeScannerVenueId.value

  if (venueId == null) {
    showLocalScanError('Choose a venue in the sidebar first.', 0)
    return
  }

  await reloadScannerForVenue(venueId)
}

onMounted(() => {
  void ensureScannerVenueLoaded()
})

watch(activeScannerVenueId, (venueId, previous) => {
  if (venueId == null) {
    showLocalScanError('Choose a venue in the sidebar first.', 0)
    return
  }

  if (venueId === previous) {
    return
  }

  void reloadScannerForVenue(venueId)
})
</script>

<template>
  <AppShell>
    <div class="mx-auto max-w-3xl">
      <PageHeader
        title="Scanner"
        badge="Staff tool"
        badge-tone="green"
        compact
        :description="venue ? `At ${venue.name}: stamp card adds stamps. Claim screen redeems rewards.` : 'Designed for a fast cashier flow.'"
      >
        <template v-if="venue" #meta>
          <span class="rounded-full bg-surface-muted px-3 py-1 text-xs font-bold text-ink-muted ring-1 ring-border">
            {{ venue.name }}
          </span>
        </template>
      </PageHeader>
      <p class="-mt-2 mb-5 text-xs text-ink-soft">
        For rewards, the customer must tap <span class="font-semibold text-ink-muted">Claim</span> in Rewards — not their stamp card.
      </p>

      <AppCard wrapper-class="overflow-hidden p-0">
        <div class="relative aspect-square bg-primary">
          <QrcodeStream
            v-if="scanning && !selectedCustomer"
            class="h-full w-full object-cover"
            @detect="handleDetect"
          />
          <div
            v-else-if="scanning && selectedCustomer"
            class="grid h-full place-items-center bg-primary px-6 text-center text-white"
          >
            <p class="text-lg font-black">Guest selected</p>
            <p class="mt-2 text-sm font-semibold text-white/75">
              {{ selectedCustomer.user?.name ?? 'Customer' }} — use the button below to add stamps.
            </p>
          </div>
          <div
            v-else-if="status === 'processing'"
            class="grid h-full place-items-center text-white"
            :class="lastScanKind === 'redeem' ? 'bg-gradient-to-br from-primary-soft to-primary' : 'bg-primary'"
          >
            <div class="text-center">
              <div class="mx-auto size-16 animate-spin rounded-full border-4 border-white/20 border-t-white" />
              <p class="mt-5 text-xl font-black">
                {{ lastScanKind === 'redeem' ? 'Redeeming reward' : 'Adding stamp' }}
              </p>
              <p class="text-sm font-semibold text-white/60">Please keep this screen open</p>
            </div>
          </div>
          <div v-else-if="status === 'error'" class="grid h-full place-items-center bg-gradient-to-br from-danger to-primary text-primary-text">
            <div class="max-w-sm px-6 text-center">
              <div class="mx-auto grid size-20 place-items-center rounded-full bg-surface/20 text-5xl font-black">!</div>
              <p class="mt-5 text-2xl font-black">{{ scanError?.title ?? 'Scan failed' }}</p>
              <p class="mt-2 text-sm font-semibold leading-relaxed text-primary-text">{{ scanError?.detail ?? message }}</p>
              <p v-if="scanError?.hint" class="mt-3 text-xs font-medium leading-relaxed text-primary-text/80">
                {{ scanError.hint }}
              </p>
              <p v-if="scanError?.requestId" class="mt-4 font-mono text-[10px] text-primary-text/50">
                Ref {{ scanError.requestId }}
              </p>
              <button
                type="button"
                class="mt-5 rounded-2xl bg-surface px-5 py-3 text-sm font-black text-danger shadow-lg"
                @click="resetScanner"
              >
                Try again
              </button>
            </div>
          </div>
          <div
            v-else
            class="grid h-full place-items-center text-white"
            :class="lastScanKind === 'redeem' ? 'bg-gradient-to-br from-primary via-primary-soft to-primary' : 'bg-gradient-to-br from-success to-primary'"
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
          <div class="absolute inset-x-6 top-6 rounded-3xl bg-surface/90 p-4 text-center shadow-xl backdrop-blur">
            <p class="text-sm font-black text-ink">{{ statusLabel }}</p>
          </div>
        </div>

        <div
          v-if="status === 'success' && pendingClaimWarning"
          class="border-b border-sky-100 bg-sky-50/90 px-5 py-4"
        >
          <p class="text-sm font-black text-ink">Reward ready to claim</p>
          <p class="mt-1 text-sm font-medium text-ink-muted">{{ pendingClaimWarning.message }}</p>
          <ul v-if="pendingClaimWarning.rewards.length" class="mt-2 space-y-1 text-sm text-ink-muted">
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
            <p class="text-sm font-black text-ink">Stamps to add</p>
            <p class="text-xs font-semibold text-ink-muted">Only when scanning the customer loyalty card.</p>
            <div class="mt-3 grid grid-cols-5 gap-2">
              <button
                v-for="amount in [1, 2, 3, 4, 5]"
                :key="amount"
                type="button"
                :disabled="isBusy"
                :class="[
                  'h-11 rounded-2xl text-sm font-black transition',
                  !useCustomStamps && selectedPresetStamps === amount ? 'bg-primary text-white' : 'bg-surface-muted text-ink-muted hover:bg-border',
                  isBusy ? 'cursor-not-allowed opacity-50' : '',
                ]"
                @click="selectPresetAmount(amount)"
              >
                {{ amount }}
              </button>
            </div>
            <label class="mt-3 block text-sm font-bold text-ink-muted" for="custom-stamps">Custom amount</label>
            <input
              id="custom-stamps"
              v-model.number="customStamps"
              min="1"
              max="100"
              type="number"
              :disabled="isBusy"
              class="mt-2 h-12 w-full rounded-2xl border border-border bg-surface-muted px-4 text-sm font-medium outline-none transition focus:border-ink-soft focus:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Custom stamps"
              @focus="useCustomStamps = true"
            >
          </div>

          <div class="rounded-[1.5rem] bg-surface-muted p-4 ring-1 ring-border">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-sm font-black text-ink">Customer fallback</p>
                <p class="text-xs font-semibold text-ink-muted">Pick a guest if the camera cannot read their My QR.</p>
              </div>
              <AppBadge>{{ customerLoading ? 'Loading' : `${customers.length} cards` }}</AppBadge>
            </div>

            <input
              v-model="customerSearch"
              :disabled="isBusy"
              class="mt-3 h-12 w-full rounded-2xl border border-border bg-surface px-4 text-sm font-medium outline-none transition focus:border-ink-soft disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Search by name or email"
            >

            <div v-if="selectedCustomer" class="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-success-bg p-3 ring-1 ring-success-border">
              <div>
                <p class="font-black text-success-text">{{ selectedCustomer.user?.name ?? 'Customer' }}</p>
                <p class="text-sm font-semibold text-success-text">{{ selectedCustomer.stamps }} current stamps</p>
              </div>
              <button type="button" class="text-sm font-black text-success-text" @click="clearSelectedCustomer">
                Clear
              </button>
            </div>

            <div v-else class="mt-3 space-y-2">
              <p v-if="customerLoadError" class="rounded-2xl bg-danger-soft p-3 text-sm font-semibold text-danger ring-1 ring-danger/30">
                {{ customerLoadError }}
                <button type="button" class="ml-2 font-black underline" @click="loadCustomers">Retry</button>
              </p>
              <button
                v-for="item in filteredCustomers"
                :key="item.id"
                type="button"
                :disabled="isBusy"
                class="flex w-full items-center justify-between gap-3 rounded-2xl bg-surface p-3 text-left ring-1 ring-border transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
                @click="selectCustomerForFallback(item)"
              >
                <span>
                  <span class="block font-black text-ink">{{ item.user?.name ?? 'Customer' }}</span>
                  <span class="block text-sm font-semibold text-ink-muted">{{ item.user?.email }}</span>
                </span>
                <span class="text-sm font-black text-ink-muted">{{ item.stamps }} stamps</span>
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

          <AppButton class="w-full" size="lg" :disabled="!canUseFallback" @click="addStampFromFallback">
            {{
              submitting
                ? 'Adding stamps...'
                : !venue
                  ? 'Choose a venue in the sidebar'
                  : !selectedCustomer
                    ? 'Select a customer below'
                    : `Add ${selectedStampAmount} ${selectedStampAmount === 1 ? 'stamp' : 'stamps'} for ${selectedCustomer.user?.name ?? 'guest'}`
            }}
          </AppButton>
        </div>

        <div v-else-if="status === 'success' && !pendingClaimWarning" class="p-5">
          <div v-if="redeemedReward" class="mb-4 flex items-center gap-3 rounded-2xl bg-accent-soft p-3 ring-1 ring-accent-border">
            <img :src="rewardThumbUrl(redeemedReward)" alt="" class="size-12 rounded-xl object-cover ring-1 ring-white">
            <div>
              <p class="font-black text-ink">{{ redeemedReward.title }}</p>
              <p class="text-sm font-semibold text-primary">Marked as used</p>
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
