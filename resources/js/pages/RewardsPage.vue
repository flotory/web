<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import CustomerRewardWallet from '@/components/loyalty/CustomerRewardWallet.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppShell from '@/layouts/AppShell.vue'
import { api, ApiError } from '@/lib/api'
import {
  rewardCategoryFromTitle,
  rewardCategoryLabel,
  rewardFallbackStyle,
  rewardIcon,
} from '@/lib/rewardVisuals'
import { useAuthStore } from '@/stores/auth'
import { useRealtimeStore } from '@/stores/realtime'
import { useWorkspaceStore } from '@/stores/workspace'
import type { Customer, Reward, RewardJourney, StampAddedPayload, Venue, Visit } from '@/types'

interface RedemptionResponse {
  customer: Customer
  next_reward: Reward | null
  available_rewards: Reward[]
  journey: RewardJourney
  recent_visits: Visit[]
}

interface RewardTemplate {
  id: string
  name: string
  emoji: string
  description: string
  rewards: Array<{ title: string; required_stamps: number; description: string }>
}

const rewardTemplates: RewardTemplate[] = [
  {
    id: 'cafe-starter',
    name: 'Cafe Starter',
    emoji: '☕',
    description: 'Fast wins for coffee shops',
    rewards: [
      { title: 'Free coffee', required_stamps: 5, description: 'Reward regular guests with a signature coffee.' },
      { title: 'Free dessert', required_stamps: 10, description: 'Celebrate loyalty with a sweet treat.' },
    ],
  },
  {
    id: 'bar-loyalty',
    name: 'Bar Loyalty',
    emoji: '🍸',
    description: 'Nightlife-friendly milestones',
    rewards: [
      { title: 'Free cocktail', required_stamps: 7, description: 'Turn occasional visitors into regulars.' },
      { title: 'VIP table priority', required_stamps: 12, description: 'Exclusive perk for your best guests.' },
    ],
  },
  {
    id: 'restaurant-retention',
    name: 'Restaurant Retention',
    emoji: '🍕',
    description: 'Drive repeat dining visits',
    rewards: [
      { title: '20% OFF', required_stamps: 8, description: 'A loyalty discount guests love to unlock.' },
      { title: 'Free appetizer', required_stamps: 14, description: 'Shareable reward that feels generous.' },
    ],
  },
]

const bestPractices = [
  'Smaller rewards unlock faster — guests stay motivated when progress feels close.',
  '5–7 visit milestones perform best for cafes and bars.',
  'Visible progress bars increase completion rates more than hidden thresholds.',
]

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const realtime = useRealtimeStore()
const workspace = useWorkspaceStore()
const rewards = ref<Reward[]>([])
const customer = ref<Customer | null>(null)
const venue = ref<Venue | null>(null)
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const successMessage = ref('')
const fieldErrors = ref<Record<string, string>>({})
const formOpen = ref(false)
const showTemplatePicker = ref(false)
const title = ref('')
const description = ref('')
const requiredStamps = ref(5)
const imageFile = ref<File | null>(null)
const imageInput = ref<HTMLInputElement | null>(null)
const titleInput = ref<HTMLInputElement | null>(null)
const removeImage = ref(false)
const journey = ref<RewardJourney | null>(null)
const selectedReward = ref<Reward | null>(null)
const editingReward = ref<Reward | null>(null)
const menuRewardId = ref<number | null>(null)
const previewOpen = ref(false)
const deleteRewardTarget = ref<Reward | null>(null)
let refreshTimer: number | undefined
let successTimer: number | undefined

const canManageRewards = computed(() => auth.user?.role === 'admin' || workspace.hasMembership)
const needsVenuePick = computed(
  () => canManageRewards.value && workspace.activeVenues.length > 1 && workspace.effectiveVenueId === null,
)
const milestones = computed(() => journey.value?.milestones ?? [])
const customerStamps = computed(() => customer.value?.stamps ?? journey.value?.current_stamps ?? 0)
const nextMilestone = computed(() => journey.value?.next_milestone ?? null)
const nextDistance = computed(() => (nextMilestone.value ? Math.max(nextMilestone.value.required_stamps - customerStamps.value, 0) : 0))
const canEditRewards = computed(() => {
  if (auth.user?.role === 'admin') {
    return true
  }
  const role = venue.value?.membership_role
  return role === 'owner' || role === 'manager'
})

const sortedOwnerRewards = computed(() =>
  [...rewards.value].sort((a, b) => a.required_stamps - b.required_stamps),
)

const activeRewardCount = computed(() => rewards.value.filter((reward) => reward.active).length)

const avgUnlockVisits = computed(() => {
  const active = rewards.value.filter((reward) => reward.active)
  if (!active.length) return 0
  return Math.round(active.reduce((sum, reward) => sum + reward.required_stamps, 0) / active.length)
})

const demoProgressStamps = computed(() => {
  const max = sortedOwnerRewards.value.at(-1)?.required_stamps ?? 10
  return Math.min(Math.floor(max * 0.45), max - 1)
})

function showSuccess(message: string) {
  successMessage.value = message
  if (successTimer) {
    window.clearTimeout(successTimer)
  }
  successTimer = window.setTimeout(() => {
    successMessage.value = ''
  }, 3500)
}

function resetForm() {
  title.value = ''
  description.value = ''
  requiredStamps.value = suggestedNextStamp()
  imageFile.value = null
  removeImage.value = false
  editingReward.value = null
  showTemplatePicker.value = false
  fieldErrors.value = {}
  if (imageInput.value) {
    imageInput.value.value = ''
  }
}

function suggestedNextStamp(): number {
  const existing = new Set(rewards.value.map((reward) => reward.required_stamps))
  let candidate = 5
  while (existing.has(candidate) && candidate <= 100) {
    candidate += 1
  }
  return candidate
}

function openImagePicker() {
  imageInput.value?.click()
}

function clearImage() {
  imageFile.value = null
  removeImage.value = true
  if (imageInput.value) {
    imageInput.value.value = ''
  }
  showSuccess('Image will be removed when you save.')
}

function toggleMenu(rewardId: number) {
  menuRewardId.value = menuRewardId.value === rewardId ? null : rewardId
}

function closeMenu() {
  menuRewardId.value = null
}

function startEditing(reward: Reward) {
  closeMenu()
  formOpen.value = true
  showTemplatePicker.value = false
  editingReward.value = reward
  fieldErrors.value = {}
  title.value = reward.title
  description.value = reward.description ?? ''
  requiredStamps.value = reward.required_stamps
  imageFile.value = null
  removeImage.value = false
  if (imageInput.value) {
    imageInput.value.value = ''
  }
  error.value = ''
  nextTick(() => {
    titleInput.value?.focus()
    titleInput.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
}

function applyRouteEditingIntent() {
  const rewardId = Number(route.query.reward_id)
  if (!rewardId || !canEditRewards.value) return
  const reward = rewards.value.find((item) => item.id === rewardId)
  if (!reward) return
  startEditing(reward)
  void router.replace({ query: { ...route.query, reward_id: undefined } })
}

function openCreateForm() {
  if (needsVenuePick.value) {
    error.value = 'Select a specific venue in the sidebar filter first.'
    return
  }
  if (editingReward.value) {
    resetForm()
  }
  formOpen.value = true
  showTemplatePicker.value = true
  requiredStamps.value = suggestedNextStamp()
  fieldErrors.value = {}
  error.value = ''
}

function closeCreateForm() {
  resetForm()
  formOpen.value = false
}

async function loadRewards(silent = false) {
  if (!silent) {
    loading.value = true
    error.value = ''
  }

  try {
    await workspace.bootstrap()

    if (canManageRewards.value) {
      const forcedVenueId = typeof route.query.venue_id === 'string' ? Number(route.query.venue_id) : null
      if (forcedVenueId && workspace.activeVenues.some((item) => item.id === forcedVenueId)) {
        workspace.setFilter(forcedVenueId)
      }
      const venueId = workspace.effectiveVenueId
      venue.value = venueId ? (workspace.activeVenues.find((item) => item.id === venueId) ?? null) : null
      rewards.value = venueId ? (await api<{ rewards: Reward[] }>(`/venues/${venueId}/rewards`)).rewards : []
      journey.value = venueId && rewards.value.length
        ? {
            current_cycle: 1,
            current_stamps: 0,
            next_milestone: rewards.value[0] ?? null,
            milestones: rewards.value.map((reward) => ({
              ...reward,
              unlocked: false,
              claimed: false,
            })),
          }
        : null
    } else {
      const cards = await api<{ active_card: Customer | null; journey: RewardJourney | null }>('/customer/cards')
      customer.value = cards.active_card
      venue.value = cards.active_card?.venue ?? null
      const rewardResponse = cards.active_card
        ? await api<{ rewards: Reward[]; journey: RewardJourney }>(`/customers/${cards.active_card.id}/rewards`)
        : null
      rewards.value = rewardResponse?.rewards ?? []
      journey.value = rewardResponse?.journey ?? cards.journey
    }

    applyRouteEditingIntent()
  } catch {
    if (!silent) {
      error.value = 'Could not load rewards.'
    }
  } finally {
    if (!silent) {
      loading.value = false
    }
  }
}

async function saveReward() {
  if (!venue.value) {
    error.value = 'Select a venue in the sidebar filter first.'
    return
  }

  saving.value = true
  error.value = ''
  fieldErrors.value = {}

  try {
    const duplicateThreshold = rewards.value.some(
      (reward) => reward.required_stamps === requiredStamps.value && reward.id !== editingReward.value?.id,
    )
    if (duplicateThreshold) {
      error.value = 'A milestone already exists for this visits threshold.'
      return
    }

    const isEditing = Boolean(editingReward.value)
    const replacingImage = Boolean(imageFile.value)
    const removingImage = removeImage.value

    const body = new FormData()
    body.append('title', title.value)
    body.append('required_stamps', String(requiredStamps.value))
    body.append('description', description.value)
    body.append('active', '1')

    if (removeImage.value) {
      body.append('remove_image', '1')
    }

    if (imageFile.value) {
      body.append('image', imageFile.value)
    }

    if (editingReward.value) {
      await api<{ reward: Reward }>(`/venues/${venue.value.id}/rewards/${editingReward.value.id}`, {
        method: 'PUT',
        body,
      })
    } else {
      await api<{ reward: Reward }>(`/venues/${venue.value.id}/rewards`, {
        method: 'POST',
        body,
      })
    }

    resetForm()
    formOpen.value = false
    await loadRewards()
    if (isEditing) {
      if (replacingImage) {
        showSuccess('Milestone updated and image replaced.')
      } else if (removingImage) {
        showSuccess('Milestone updated and image removed.')
      } else {
        showSuccess('Milestone updated.')
      }
    } else {
      showSuccess(replacingImage ? 'Milestone created with image.' : 'Milestone created.')
    }
  } catch (exception) {
    if (exception instanceof ApiError) {
      error.value = exception.message
      fieldErrors.value = Object.fromEntries(
        Object.entries(exception.errors).map(([key, messages]) => [key, messages[0] ?? 'Invalid value']),
      )
    } else {
      error.value = 'Could not save milestone.'
    }
  } finally {
    saving.value = false
  }
}

async function applyTemplate(template: RewardTemplate) {
  if (!venue.value) return
  closeMenu()
  saving.value = true
  error.value = ''
  let created = 0

  try {
    for (const templateReward of template.rewards) {
      const exists = rewards.value.some((reward) => reward.required_stamps === templateReward.required_stamps)
      if (exists) continue
      const body = new FormData()
      body.append('title', templateReward.title)
      body.append('required_stamps', String(templateReward.required_stamps))
      body.append('description', templateReward.description)
      body.append('active', '1')
      await api<{ reward: Reward }>(`/venues/${venue.value.id}/rewards`, { method: 'POST', body })
      created += 1
    }
    await loadRewards()
    formOpen.value = false
    showTemplatePicker.value = false
    showSuccess(created ? `${template.name} template applied (${created} milestones).` : 'Those milestones already exist.')
  } catch (exception) {
    error.value = exception instanceof ApiError ? exception.message : 'Could not apply template.'
  } finally {
    saving.value = false
  }
}

async function duplicateReward(reward: Reward) {
  if (!venue.value) return
  closeMenu()

  let stamps = reward.required_stamps
  const used = new Set(rewards.value.map((item) => item.required_stamps))
  while (used.has(stamps) && stamps < 100) {
    stamps += 1
  }
  if (used.has(stamps)) {
    error.value = 'No free visit threshold available to duplicate.'
    return
  }

  saving.value = true
  error.value = ''

  try {
    const body = new FormData()
    body.append('title', `${reward.title} (copy)`)
    body.append('required_stamps', String(stamps))
    body.append('description', reward.description ?? '')
    body.append('active', '1')
    await api<{ reward: Reward }>(`/venues/${venue.value.id}/rewards`, { method: 'POST', body })
    await loadRewards()
    showSuccess('Milestone duplicated.')
  } catch (exception) {
    error.value = exception instanceof ApiError ? exception.message : 'Could not duplicate milestone.'
  } finally {
    saving.value = false
  }
}

async function archiveReward(reward: Reward) {
  if (!venue.value) return
  closeMenu()

  saving.value = true
  error.value = ''
  fieldErrors.value = {}

  try {
    await api<{ reward: Reward }>(`/venues/${venue.value.id}/rewards/${reward.id}/archive`, {
      method: 'PATCH',
    })
    await loadRewards()
    showSuccess('Milestone archived.')
  } catch (exception) {
    error.value = exception instanceof ApiError ? exception.message : 'Could not archive milestone.'
  } finally {
    saving.value = false
  }
}

async function reactivateReward(reward: Reward) {
  if (!venue.value) return
  closeMenu()

  saving.value = true
  error.value = ''
  fieldErrors.value = {}

  try {
    await api<{ reward: Reward }>(`/venues/${venue.value.id}/rewards/${reward.id}/reactivate`, {
      method: 'PATCH',
    })
    await loadRewards()
    showSuccess('Milestone reactivated.')
  } catch (exception) {
    error.value = exception instanceof ApiError ? exception.message : 'Could not reactivate milestone.'
  } finally {
    saving.value = false
  }
}

function openDeleteModal(reward: Reward) {
  closeMenu()
  deleteRewardTarget.value = reward
}

function closeDeleteModal() {
  deleteRewardTarget.value = null
}

async function deleteReward(reward: Reward) {
  if (!venue.value) return

  saving.value = true
  error.value = ''
  fieldErrors.value = {}

  try {
    await api<void>(`/venues/${venue.value.id}/rewards/${reward.id}/purge`, {
      method: 'DELETE',
    })
    if (editingReward.value?.id === reward.id) {
      resetForm()
      formOpen.value = false
    }
    closeDeleteModal()
    await loadRewards()
    showSuccess('Milestone deleted.')
  } catch (exception) {
    error.value = exception instanceof ApiError ? exception.message : 'Could not delete milestone.'
  } finally {
    saving.value = false
  }
}

function openCustomerReward(reward: Reward | undefined) {
  if (canManageRewards.value || !reward) return

  const milestone = milestones.value.find((item) => item.id === reward.id)
  if (!milestone?.unlocked || milestone.claimed) return

  selectedReward.value = reward
}

function closeCustomerReward() {
  selectedReward.value = null
}

function applyRedemption(response: RedemptionResponse) {
  customer.value = response.customer
  journey.value = response.journey
}

function applyRealtimeStamp(payload: StampAddedPayload) {
  if (!customer.value || payload.customer.id !== customer.value.id) {
    return
  }

  customer.value = payload.customer
  if (journey.value) {
    journey.value = {
      ...journey.value,
      current_cycle: payload.current_cycle,
      current_stamps: payload.customer.stamps,
      milestones: payload.milestones,
      next_milestone: payload.next_reward,
    }
  }
}

function refreshIfVisible() {
  if (document.visibilityState === 'visible' && !formOpen.value) {
    loadRewards(true)
  }
}

function onImageChange(event: Event) {
  const input = event.target as HTMLInputElement
  imageFile.value = input.files?.[0] ?? null
  if (imageFile.value) {
    removeImage.value = false
    showSuccess(`Image selected: ${imageFile.value.name}`)
  }
}

function progressPercent(reward: Reward): number {
  const visits = venue.value?.visits_count ?? 0
  return Math.min((visits / reward.required_stamps) * 100, 100)
}

function timelineReach(reward: Reward, index: number): boolean {
  const visits = venue.value?.visits_count ?? 0
  return visits >= reward.required_stamps || index === 0
}

onMounted(() => {
  loadRewards()
  window.addEventListener('focus', refreshIfVisible)
  document.addEventListener('visibilitychange', refreshIfVisible)
  refreshTimer = window.setInterval(() => {
    if (!formOpen.value) {
      loadRewards(true)
    }
  }, 10000)
})

onUnmounted(() => {
  window.removeEventListener('focus', refreshIfVisible)
  document.removeEventListener('visibilitychange', refreshIfVisible)
  window.clearInterval(refreshTimer)
  if (successTimer) {
    window.clearTimeout(successTimer)
  }
})

watch(
  () => realtime.latestStamp,
  (payload) => {
    if (payload) {
      applyRealtimeStamp(payload)
    }
  },
)

watch(() => workspace.filterVenueId, () => loadRewards())
watch(() => route.query.reward_id, () => applyRouteEditingIntent())
</script>

<template>
  <AppShell>
    <input
      ref="imageInput"
      type="file"
      accept="image/png,image/jpeg,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
      class="hidden"
      @change="onImageChange"
    >

    <!-- Owner / staff milestone builder -->
    <template v-if="canManageRewards">
      <section class="journey-hero relative overflow-hidden rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 shadow-2xl shadow-slate-950/30 sm:p-8">
        <div class="journey-hero-glow pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-cyan-400/20 blur-3xl" />
        <div class="journey-hero-glow pointer-events-none absolute -bottom-20 left-8 size-48 rounded-full bg-indigo-500/20 blur-3xl" />
        <div class="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <AppBadge tone="blue">Milestone builder</AppBadge>
            <h1 class="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">Rewards Journey</h1>
            <p class="mt-3 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
              Design milestone rewards that turn occasional guests into loyal regulars.
            </p>
            <p v-if="!needsVenuePick && venue" class="mt-4 text-sm font-semibold text-cyan-200/90">
              {{ activeRewardCount }} active rewards
              <span class="text-white/40">•</span>
              Avg unlock: {{ avgUnlockVisits || '—' }} visits
              <span v-if="venue.name" class="text-white/40">•</span>
              <span v-if="venue.name">{{ venue.name }}</span>
            </p>
          </div>
          <div v-if="canEditRewards" class="flex flex-wrap gap-2">
            <AppButton variant="secondary" class="border-white/15 bg-white/10 text-white hover:bg-white/20" @click="previewOpen = true">
              Preview guest journey
            </AppButton>
            <AppButton variant="secondary" class="hero-cta shrink-0 bg-white font-bold text-slate-950 shadow-lg shadow-black/20 hover:bg-slate-100" @click="openCreateForm">
              + Create milestone
            </AppButton>
          </div>
        </div>
      </section>

      <AppCard v-if="canEditRewards && needsVenuePick" wrapper-class="mt-4">
        <p class="text-sm font-bold text-slate-500">Select a specific venue in the sidebar filter to manage milestones.</p>
      </AppCard>

      <AppCard v-else-if="loading" wrapper-class="mt-4">
        <p class="text-sm font-bold text-slate-500">Loading your rewards journey...</p>
      </AppCard>

      <AppCard v-else-if="error" wrapper-class="mt-4 border-red-200 bg-red-50">
        <p class="text-sm font-bold text-red-600">{{ error }}</p>
      </AppCard>

      <AppCard v-else-if="successMessage" wrapper-class="mt-4 border-emerald-200 bg-emerald-50">
        <p class="text-sm font-bold text-emerald-700">{{ successMessage }}</p>
      </AppCard>

      <!-- Create / edit panel -->
      <div
        v-if="formOpen && canEditRewards && !needsVenuePick"
        class="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60"
      >
        <div class="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4 sm:px-6">
          <h2 class="text-lg font-black text-slate-950">
            {{ editingReward ? 'Edit milestone' : 'Create a collectible milestone' }}
          </h2>
          <p class="mt-1 text-sm text-slate-500">
            {{ editingReward ? 'Update how guests unlock this reward.' : 'Pick a template or craft your own — achievable rewards drive repeat visits.' }}
          </p>
        </div>

        <div v-if="showTemplatePicker && !editingReward" class="border-b border-slate-100 p-5 sm:p-6">
          <p class="text-xs font-bold uppercase tracking-wide text-slate-400">Smart templates</p>
          <div class="mt-3 grid gap-3 md:grid-cols-3">
            <button
              v-for="template in rewardTemplates"
              :key="template.id"
              type="button"
              class="template-card group rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-lg"
              :disabled="saving"
              @click="applyTemplate(template)"
            >
              <p class="text-2xl">{{ template.emoji }}</p>
              <p class="mt-2 font-black text-slate-900">{{ template.name }}</p>
              <p class="mt-1 text-xs text-slate-500">{{ template.description }}</p>
              <p class="mt-3 text-xs font-semibold text-indigo-600 group-hover:text-indigo-700">
                {{ template.rewards.map((item) => `${item.required_stamps} visits`).join(' → ') }}
              </p>
            </button>
          </div>
          <button type="button" class="mt-4 text-sm font-bold text-slate-500 hover:text-slate-800" @click="showTemplatePicker = false">
            Or build a custom milestone ↓
          </button>
        </div>

        <form class="grid gap-4 p-5 sm:grid-cols-2 sm:p-6" @submit.prevent="saveReward">
          <div>
            <label class="text-sm font-bold text-slate-600" for="reward-title">Reward title</label>
            <input
              id="reward-title"
              ref="titleInput"
              v-model="title"
              required
              class="mt-2 h-12 w-full rounded-2xl border bg-slate-50 px-4 text-sm font-medium outline-none focus:bg-white"
              :class="fieldErrors.title ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-slate-400'"
              placeholder="Free signature coffee"
            >
            <p v-if="fieldErrors.title" class="mt-1 text-xs font-semibold text-red-600">{{ fieldErrors.title }}</p>
          </div>
          <div>
            <label class="text-sm font-bold text-slate-600" for="reward-stamps">Unlock after visits</label>
            <input
              id="reward-stamps"
              v-model.number="requiredStamps"
              required
              min="1"
              max="100"
              type="number"
              class="mt-2 h-12 w-full rounded-2xl border bg-slate-50 px-4 text-sm font-medium outline-none focus:bg-white"
              :class="fieldErrors.required_stamps ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-slate-400'"
            >
            <p v-if="fieldErrors.required_stamps" class="mt-1 text-xs font-semibold text-red-600">{{ fieldErrors.required_stamps }}</p>
          </div>
          <div class="sm:col-span-2">
            <label class="text-sm font-bold text-slate-600" for="reward-description">Emotional description</label>
            <textarea
              id="reward-description"
              v-model="description"
              rows="3"
              class="mt-2 w-full rounded-2xl border bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:bg-white"
              :class="fieldErrors.description ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-slate-400'"
              placeholder="Reward regular guests with a free signature coffee they'll talk about."
            />
            <p v-if="fieldErrors.description" class="mt-1 text-xs font-semibold text-red-600">{{ fieldErrors.description }}</p>
          </div>
          <div class="sm:col-span-2">
            <label class="text-sm font-bold text-slate-600">Reward visual</label>
            <p class="mt-1 text-xs text-slate-400">Upload a photo or we'll generate a premium fallback automatically.</p>
            <div v-if="editingReward?.image && !removeImage && !imageFile" class="mt-3 overflow-hidden rounded-2xl border border-slate-200">
              <img :src="editingReward.image" alt="" class="h-36 w-full object-cover">
            </div>
            <div class="mt-3 flex flex-wrap items-center gap-2">
              <AppButton type="button" variant="secondary" size="sm" @click="openImagePicker">
                {{ imageFile ? 'Replace image' : 'Upload image' }}
              </AppButton>
              <AppButton v-if="imageFile || (editingReward?.image && !removeImage)" type="button" variant="ghost" size="sm" @click="clearImage">
                Remove
              </AppButton>
              <p class="text-sm font-semibold text-slate-500">
                {{ imageFile?.name ?? (removeImage ? 'Image will be removed' : 'Auto illustration if empty') }}
              </p>
            </div>
            <p v-if="fieldErrors.image" class="mt-1 text-xs font-semibold text-red-600">{{ fieldErrors.image }}</p>
          </div>
          <div class="flex flex-wrap gap-2 sm:col-span-2">
            <AppButton type="submit" :disabled="saving">
              {{ saving ? 'Saving...' : (editingReward ? 'Save changes' : 'Publish milestone') }}
            </AppButton>
            <AppButton type="button" variant="ghost" :disabled="saving" @click="closeCreateForm">Cancel</AppButton>
          </div>
        </form>
      </div>

      <!-- Empty state -->
      <section
        v-if="!loading && !sortedOwnerRewards.length && !needsVenuePick && canEditRewards"
        class="mt-6 overflow-hidden rounded-3xl border border-dashed border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-8 text-center shadow-inner"
      >
        <p class="text-4xl">🎁</p>
        <h2 class="mt-4 text-3xl font-black text-slate-950">Create your first reward</h2>
        <p class="mx-auto mt-2 max-w-lg text-sm text-slate-600">
          Customers return more often when rewards feel achievable. Start with a 5-visit win — guests love seeing progress move.
        </p>
        <div class="mt-6 flex flex-wrap justify-center gap-2">
          <AppButton @click="openCreateForm">Create first milestone</AppButton>
          <AppButton variant="secondary" @click="previewOpen = true">Preview guest journey</AppButton>
        </div>
        <div class="mt-8 grid gap-3 text-left md:grid-cols-3">
          <button
            v-for="template in rewardTemplates"
            :key="`empty-${template.id}`"
            type="button"
            class="rounded-2xl border border-white bg-white/80 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            :disabled="saving"
            @click="applyTemplate(template)"
          >
            <p class="text-2xl">{{ template.emoji }}</p>
            <p class="mt-2 font-black text-slate-900">{{ template.name }}</p>
            <p class="mt-1 text-xs text-slate-500">{{ template.rewards[0]?.title }}</p>
          </button>
        </div>
      </section>

      <!-- Timeline journey -->
      <section v-else-if="!loading && sortedOwnerRewards.length && !needsVenuePick" class="mt-6">
        <div class="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 class="text-xl font-black text-slate-950">Your milestone journey</h2>
            <p class="mt-1 text-sm text-slate-500">Guests progress left to right — each unlock feels collectible.</p>
          </div>
        </div>

        <div class="timeline-track relative">
          <div class="timeline-line hidden md:block" aria-hidden="true" />
          <div class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <article
              v-for="(reward, index) in sortedOwnerRewards"
              :key="reward.id"
              class="milestone-card group relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50 transition duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-100/40"
              :class="{ 'milestone-card--paused': !reward.active }"
            >
              <div class="relative">
                <div v-if="reward.image" class="h-40 overflow-hidden">
                  <img :src="reward.image" alt="" class="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]">
                </div>
                <div v-else class="relative h-40 overflow-hidden px-5 py-4 text-white" :class="rewardFallbackStyle(reward.title)">
                  <div class="milestone-shimmer pointer-events-none absolute inset-0 opacity-30" />
                  <p class="relative text-4xl">{{ rewardIcon(reward.title) }}</p>
                  <p class="relative mt-2 text-xs font-bold uppercase tracking-[0.2em] text-white/80">
                    {{ rewardCategoryLabel(rewardCategoryFromTitle(reward.title)) }}
                  </p>
                </div>
                <div class="absolute left-3 top-3 flex flex-wrap gap-2">
                  <span class="rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-700 shadow-sm">
                    {{ rewardCategoryLabel(rewardCategoryFromTitle(reward.title)) }}
                  </span>
                  <AppBadge :tone="reward.active ? 'green' : 'amber'">{{ reward.active ? 'Live' : 'Paused' }}</AppBadge>
                </div>
                <div class="absolute right-3 top-3">
                  <button
                    type="button"
                    class="rounded-xl bg-white/95 px-2.5 py-1.5 text-sm font-black text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-white"
                    @click="toggleMenu(reward.id)"
                  >
                    ⋯
                  </button>
                  <div
                    v-if="menuRewardId === reward.id"
                    class="absolute right-0 z-20 mt-2 w-48 rounded-2xl bg-white p-2 shadow-xl ring-1 ring-slate-200"
                  >
                    <button class="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100" @click="startEditing(reward)">
                      Edit reward
                    </button>
                    <button class="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100" @click="previewOpen = true">
                      Preview guest view
                    </button>
                    <button class="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100" :disabled="saving" @click="duplicateReward(reward)">
                      Duplicate
                    </button>
                    <button
                      v-if="reward.active"
                      class="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-amber-700 hover:bg-amber-50"
                      :disabled="saving"
                      @click="archiveReward(reward)"
                    >
                      Archive
                    </button>
                    <button
                      v-else
                      class="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
                      :disabled="saving"
                      @click="reactivateReward(reward)"
                    >
                      Reactivate
                    </button>
                    <button class="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50" :disabled="saving" @click="openDeleteModal(reward)">
                      Delete permanently
                    </button>
                  </div>
                </div>
              </div>

              <div class="p-5">
                <div class="flex items-start gap-2">
                  <span
                    class="timeline-node mt-1 grid size-7 shrink-0 place-items-center rounded-full text-xs font-black"
                    :class="timelineReach(reward, index) ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40' : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200'"
                  >
                    {{ reward.required_stamps }}
                  </span>
                  <div>
                    <h3 class="text-xl font-black text-slate-950">{{ reward.title }}</h3>
                    <p class="mt-1 text-sm font-semibold text-indigo-600">
                      Unlock after {{ reward.required_stamps }} {{ reward.required_stamps === 1 ? 'visit' : 'visits' }}
                    </p>
                  </div>
                </div>
                <p class="mt-3 text-sm leading-relaxed text-slate-600">
                  {{ reward.description || 'Reward regular guests and make every visit feel closer to something special.' }}
                </p>
                <div class="mt-4">
                  <div class="flex items-center justify-between text-xs font-bold text-slate-500">
                    <span>Guest progress preview</span>
                    <span>{{ Math.min(venue?.visits_count ?? 0, reward.required_stamps) }} / {{ reward.required_stamps }}</span>
                  </div>
                  <div class="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      class="progress-fill h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400"
                      :style="{ width: `${progressPercent(reward)}%` }"
                    />
                  </div>
                </div>
                <div class="mt-4 flex flex-wrap gap-2">
                  <AppButton size="sm" variant="secondary" @click="startEditing(reward)">Edit</AppButton>
                  <AppButton size="sm" variant="ghost" @click="previewOpen = true">Guest preview</AppButton>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <!-- Bottom: insights + preview CTA -->
      <div v-if="!loading && !needsVenuePick" class="mt-8 grid gap-4 lg:grid-cols-3">
        <AppCard wrapper-class="lg:col-span-2 border-slate-200 bg-gradient-to-br from-slate-50 to-white">
          <h2 class="text-lg font-black text-slate-950">Reward psychology</h2>
          <p class="mt-1 text-sm text-slate-500">Flotory helps you design milestones guests actually complete.</p>
          <ul class="mt-4 space-y-3">
            <li v-for="tip in bestPractices" :key="tip" class="flex gap-3 text-sm text-slate-700">
              <span class="mt-0.5 text-emerald-500">◆</span>
              <span>{{ tip }}</span>
            </li>
          </ul>
        </AppCard>

        <AppCard wrapper-class="relative overflow-hidden border-slate-800 bg-gradient-to-br from-slate-950 to-indigo-950 text-white">
          <div class="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-cyan-400/20 blur-2xl" />
          <h2 class="relative text-lg font-black">Analytics preview</h2>
          <p class="relative mt-1 text-sm text-white/60">Unlocks after your first guest visits.</p>
          <div class="relative mt-4 space-y-2 opacity-70">
            <div class="h-16 rounded-xl bg-white/10" />
            <div class="grid grid-cols-3 gap-2">
              <div class="h-10 rounded-lg bg-white/10" />
              <div class="h-10 rounded-lg bg-white/15" />
              <div class="h-10 rounded-lg bg-white/10" />
            </div>
          </div>
          <p class="relative mt-4 text-xs font-semibold text-cyan-200/80">Track repeat visits • Busiest hours • Reward performance</p>
        </AppCard>
      </div>
    </template>

    <!-- Customer journey view -->
    <template v-else>
      <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <AppBadge tone="blue">Progress journey</AppBadge>
          <h1 class="mt-3 text-4xl font-black tracking-tight text-slate-950">Rewards Journey</h1>
          <p class="mt-2 text-slate-500">Unlock milestones as you keep visiting. Progress never goes backwards.</p>
        </div>
      </div>

      <AppCard v-if="journey" wrapper-class="mb-4 bg-slate-950 text-white">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-bold uppercase tracking-wide text-white/60">Current cycle</p>
            <p class="mt-2 text-3xl font-black">{{ journey.current_cycle }}</p>
          </div>
          <div class="text-right">
            <p class="text-xs font-bold uppercase tracking-wide text-white/60">Progress</p>
            <p class="mt-2 text-2xl font-black">{{ customerStamps }}</p>
            <p v-if="nextMilestone" class="text-sm font-semibold text-white/70">{{ nextDistance }} to {{ nextMilestone.title }}</p>
          </div>
        </div>
      </AppCard>

      <AppCard v-if="loading" wrapper-class="mb-4">
        <p class="text-sm font-bold text-slate-500">Loading milestones...</p>
      </AppCard>
      <AppCard v-else-if="error" wrapper-class="mb-4">
        <p class="text-sm font-bold text-red-600">{{ error }}</p>
      </AppCard>

      <div class="grid gap-4 md:grid-cols-2">
        <article
          v-for="milestone in milestones"
          :key="milestone.id"
          class="customer-milestone cursor-pointer overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
          @click="openCustomerReward(rewards.find((item) => item.id === milestone.id))"
        >
          <div v-if="milestone.image" class="h-36 overflow-hidden">
            <img :src="milestone.image" alt="" class="h-full w-full object-cover">
          </div>
          <div v-else class="flex h-36 items-end px-5 py-4 text-white" :class="rewardFallbackStyle(milestone.title)">
            <div>
              <p class="text-3xl">{{ rewardIcon(milestone.title) }}</p>
              <p class="mt-1 text-xs font-bold uppercase tracking-wide text-white/80">{{ milestone.required_stamps }} visits</p>
            </div>
          </div>
          <div class="p-5">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h2 class="text-2xl font-black text-slate-950">{{ milestone.title }}</h2>
                <p class="mt-1 text-sm font-semibold text-slate-500">{{ milestone.required_stamps }} visits milestone</p>
              </div>
              <AppBadge :tone="milestone.claimed ? 'blue' : (milestone.unlocked ? 'green' : 'amber')">
                {{ milestone.claimed ? 'Claimed' : (milestone.unlocked ? 'Unlocked' : 'Locked') }}
              </AppBadge>
            </div>
            <p v-if="milestone.description" class="mt-2 text-sm text-slate-500">{{ milestone.description }}</p>
            <div class="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                class="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400"
                :style="{ width: `${Math.min((customerStamps / milestone.required_stamps) * 100, 100)}%` }"
              />
            </div>
            <p class="mt-3 text-sm font-bold text-slate-500">
              {{ milestone.unlocked && !milestone.claimed ? 'Tap to claim milestone reward' : 'Keep progressing to unlock' }}
            </p>
          </div>
        </article>
        <AppCard v-if="!loading && !milestones.length">
          <p class="text-sm font-semibold text-slate-500">No milestones yet at this venue.</p>
        </AppCard>
      </div>
    </template>

    <!-- Menu backdrop -->
    <button
      v-if="menuRewardId !== null"
      type="button"
      class="fixed inset-0 z-10 cursor-default bg-transparent"
      aria-label="Close reward menu"
      @click="closeMenu"
    />

    <!-- Delete confirmation -->
    <div
      v-if="deleteRewardTarget"
      class="fixed inset-0 z-40 grid place-items-center bg-slate-950/40 px-4 backdrop-blur-sm"
      @click.self="closeDeleteModal"
    >
      <AppCard wrapper-class="w-full max-w-md border-slate-200 bg-white p-6">
        <h2 class="text-2xl font-black text-slate-950">Delete milestone?</h2>
        <p class="mt-2 text-sm text-slate-600">
          This permanently removes <span class="font-bold text-slate-900">{{ deleteRewardTarget.title }}</span>.
        </p>
        <div class="mt-5 grid gap-2 sm:grid-cols-2">
          <AppButton variant="secondary" :disabled="saving" @click="closeDeleteModal">Cancel</AppButton>
          <AppButton :disabled="saving" class="bg-red-600 text-white hover:bg-red-700" @click="deleteReward(deleteRewardTarget)">
            {{ saving ? 'Deleting...' : 'Yes, delete' }}
          </AppButton>
        </div>
      </AppCard>
    </div>

    <!-- Guest journey preview modal -->
    <div
      v-if="previewOpen"
      class="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4 py-8 backdrop-blur-sm"
      @click.self="previewOpen = false"
    >
      <div class="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 shadow-2xl">
        <div class="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p class="text-xs font-bold uppercase tracking-wide text-cyan-200/80">Customer experience</p>
            <h2 class="text-lg font-black text-white">How guests see your journey</h2>
          </div>
          <button type="button" class="rounded-xl bg-white/10 px-3 py-1.5 text-sm font-bold text-white hover:bg-white/20" @click="previewOpen = false">
            Close
          </button>
        </div>
        <div class="p-5">
          <div class="mx-auto max-w-xs overflow-hidden rounded-[2rem] border-4 border-slate-800 bg-slate-950 shadow-2xl">
            <div class="bg-gradient-to-r from-indigo-600 to-cyan-500 px-4 py-5 text-white">
              <p class="text-xs font-bold uppercase tracking-wide text-white/70">{{ venue?.name ?? 'Your venue' }}</p>
              <p class="mt-2 text-2xl font-black">Loyalty card</p>
              <p class="mt-1 text-sm text-white/80">{{ demoProgressStamps }} visits collected</p>
            </div>
            <div class="space-y-3 p-4">
              <div
                v-for="reward in sortedOwnerRewards.slice(0, 4)"
                :key="`preview-${reward.id}`"
                class="rounded-2xl border border-white/10 bg-white/5 p-3"
              >
                <div class="flex items-center gap-3">
                  <span class="grid size-10 place-items-center rounded-xl text-lg" :class="reward.image ? '' : rewardFallbackStyle(reward.title)">
                    <img v-if="reward.image" :src="reward.image" alt="" class="size-full rounded-xl object-cover">
                    <span v-else>{{ rewardIcon(reward.title) }}</span>
                  </span>
                  <div class="min-w-0 flex-1">
                    <p class="truncate font-bold text-white">{{ reward.title }}</p>
                    <p class="text-xs text-white/60">{{ reward.required_stamps }} visits</p>
                    <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        class="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-300"
                        :style="{ width: `${Math.min((demoProgressStamps / reward.required_stamps) * 100, 100)}%` }"
                      />
                    </div>
                  </div>
                  <AppBadge :tone="demoProgressStamps >= reward.required_stamps ? 'green' : 'amber'">
                    {{ demoProgressStamps >= reward.required_stamps ? 'Ready' : 'Locked' }}
                  </AppBadge>
                </div>
              </div>
              <p v-if="!sortedOwnerRewards.length" class="py-6 text-center text-sm text-white/60">
                Add milestones to preview the guest journey.
              </p>
            </div>
          </div>
          <p class="mt-4 text-center text-sm text-white/70">
            Guests see progress bars, upcoming rewards, and unlock excitement — designed to feel like a game worth finishing.
          </p>
        </div>
      </div>
    </div>

    <CustomerRewardWallet
      v-if="selectedReward && customer"
      :customer="customer"
      :restaurant="venue"
      :reward="selectedReward"
      @close="closeCustomerReward"
      @redeemed="applyRedemption"
    />
  </AppShell>
</template>

<style scoped>
.journey-hero-glow {
  animation: ambient-drift 8s ease-in-out infinite alternate;
}

.hero-cta {
  box-shadow: 0 8px 24px rgba(255, 255, 255, 0.15);
}

.timeline-line {
  position: absolute;
  left: 12%;
  right: 12%;
  top: 5.5rem;
  height: 2px;
  background: linear-gradient(90deg, rgb(99 102 241 / 0.2), rgb(34 211 238 / 0.5), rgb(99 102 241 / 0.2));
}

.milestone-card--paused {
  opacity: 0.85;
}

.milestone-shimmer {
  background: linear-gradient(110deg, transparent 30%, rgba(255, 255, 255, 0.35) 50%, transparent 70%);
  animation: shimmer 3s ease-in-out infinite;
}

.progress-fill {
  transition: width 0.8s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes shimmer {
  0% {
    transform: translateX(-120%);
  }
  100% {
    transform: translateX(120%);
  }
}

@keyframes ambient-drift {
  from {
    transform: translate(0, 0) scale(1);
  }
  to {
    transform: translate(12px, -8px) scale(1.08);
  }
}
</style>
