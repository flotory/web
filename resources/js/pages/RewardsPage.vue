<script setup lang="ts">
import { Gift, Store } from '@lucide/vue'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import VenueLandingPreview from '@/components/loyalty/VenueLandingPreview.vue'
import AsyncActionButton from '@/components/ui/AsyncActionButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import AppShell from '@/layouts/AppShell.vue'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { api, ApiError, apiErrorMessage } from '@/lib/api'
import { rewardImageUrl, rewardHasCustomImage, rewardThumbUrl } from '@/lib/rewardMedia'
import { rewardCategoryFromTitle, rewardCategoryLabel } from '@/lib/rewardVisuals'
import { useAuthStore } from '@/stores/auth'
import { useWorkspaceStore } from '@/stores/workspace'
import type { Reward, Venue } from '@/types'

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
      { title: '50% off one coffee', required_stamps: 5, description: 'Half price on any coffee after five stamps.' },
      { title: 'Free coffee', required_stamps: 10, description: 'A complimentary coffee on the house.' },
      { title: 'Free coffee', required_stamps: 15, description: 'Another free coffee for loyal regulars.' },
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
    description: 'Drive repeat stamp collection',
    rewards: [
      { title: '20% OFF', required_stamps: 8, description: 'A loyalty discount guests love to unlock.' },
      { title: 'Free appetizer', required_stamps: 14, description: 'Shareable reward that feels generous.' },
    ],
  },
]

const bestPractices = [
  'Smaller rewards unlock faster — guests stay motivated when progress feels close.',
  '5–7 stamp milestones perform best for cafes and bars.',
  'Visible progress bars increase completion rates more than hidden thresholds.',
]

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const workspace = useWorkspaceStore()
const rewards = ref<Reward[]>([])
const venue = ref<Venue | null>(null)
const loading = ref(true)
const saving = ref(false)
const saveRewardAction = useAsyncAction()
const error = ref('')
const successMessage = ref('')
const fieldErrors = ref<Record<string, string>>({})
const formOpen = ref(false)
const showTemplatePicker = ref(false)
const title = ref('')
const description = ref('')
const requiredStamps = ref(5)
const imageFile = ref<File | null>(null)
const imagePreviewUrl = ref<string | null>(null)
const imageInput = ref<HTMLInputElement | null>(null)
const titleInput = ref<HTMLInputElement | null>(null)
const removeImage = ref(false)
const editingReward = ref<Reward | null>(null)
const menuRewardId = ref<number | null>(null)
const previewOpen = ref(false)
const deleteRewardTarget = ref<Reward | null>(null)
let refreshTimer: number | undefined
let successTimer: number | undefined

const needsVenuePick = computed(
  () => workspace.activeVenues.length > 1 && workspace.effectiveVenueId === null,
)
const canEditRewards = computed(() => {
  if (auth.user?.is_admin) {
    return true
  }
  const role = venue.value?.membership_role
  return role === 'owner'
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

const programPreviewStamps = ref(0)

const activeSortedRewards = computed(() =>
  sortedOwnerRewards.value.filter((reward) => reward.active),
)

const programCardMilestones = computed(() => {
  const items = activeSortedRewards.value.map((reward) => ({
    id: reward.id,
    title: reward.title,
    description: reward.description ?? null,
    image: reward.image ?? null,
    image_thumb: reward.image_thumb ?? null,
    required_stamps: reward.required_stamps,
    isDraft: false,
  }))

  if (!formOpen.value || !title.value.trim() || requiredStamps.value < 1) {
    return items
  }

  const draft = {
    id: editingReward.value?.id ?? -1,
    title: title.value.trim(),
    description: description.value.trim() || null,
    image: editingReward.value?.image ?? null,
    image_thumb: editingReward.value?.image_thumb ?? null,
    required_stamps: requiredStamps.value,
    isDraft: !editingReward.value || editingReward.value.required_stamps !== requiredStamps.value,
  }

  if (editingReward.value) {
    return items
      .map((milestone) => (milestone.id === editingReward.value!.id
        ? { ...draft, id: milestone.id, isDraft: true }
        : milestone))
      .sort((a, b) => a.required_stamps - b.required_stamps)
  }

  return [...items, { ...draft, isDraft: true }].sort((a, b) => a.required_stamps - b.required_stamps)
})

const programMaxStamps = computed(() => programCardMilestones.value.at(-1)?.required_stamps ?? 0)

const hasProgramLayout = computed(
  () => !needsVenuePick.value && programCardMilestones.value.length > 0,
)

function isDraftMilestone(milestone: { id: number; isDraft?: boolean }): boolean {
  return milestone.isDraft === true || milestone.id < 0
}

watch(programMaxStamps, (max) => {
  if (programPreviewStamps.value > max) {
    programPreviewStamps.value = max
  }
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

function revokeImagePreview() {
  if (imagePreviewUrl.value) {
    URL.revokeObjectURL(imagePreviewUrl.value)
    imagePreviewUrl.value = null
  }
}

function resetForm() {
  title.value = ''
  description.value = ''
  requiredStamps.value = suggestedNextStamp()
  imageFile.value = null
  revokeImagePreview()
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
  revokeImagePreview()
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

    const forcedVenueId = typeof route.query.venue_id === 'string' ? Number(route.query.venue_id) : null
    if (forcedVenueId && workspace.activeVenues.some((item) => item.id === forcedVenueId)) {
      workspace.setFilter(forcedVenueId)
    }
    const venueId = workspace.effectiveVenueId
    venue.value = venueId ? (workspace.activeVenues.find((item) => item.id === venueId) ?? null) : null
    rewards.value = venueId ? (await api<{ rewards: Reward[] }>(`/venues/${venueId}/rewards`)).rewards : []

    applyRouteEditingIntent()
  } catch (exception) {
    if (!silent) {
      error.value = apiErrorMessage(exception, 'Could not load rewards.')
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

  fieldErrors.value = {}

  const duplicateThreshold = rewards.value.some(
    (reward) => reward.required_stamps === requiredStamps.value && reward.id !== editingReward.value?.id,
  )
  if (duplicateThreshold) {
    error.value = 'A milestone already exists for this stamp threshold.'
    return
  }

  try {
    await saveRewardAction.run(async () => {
      error.value = ''

      try {
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
          await api<{ reward: Reward }>(`/venues/${venue.value!.id}/rewards/${editingReward.value.id}`, {
            method: 'PUT',
            body,
          })
        } else {
          await api<{ reward: Reward }>(`/venues/${venue.value!.id}/rewards`, {
            method: 'POST',
            body,
          })
        }

        resetForm()
        formOpen.value = false
        await loadRewards()
      } catch (exception) {
        if (exception instanceof ApiError) {
          error.value = exception.message
          fieldErrors.value = Object.fromEntries(
            Object.entries(exception.errors).map(([key, messages]) => [key, messages[0] ?? 'Invalid value']),
          )
        } else {
          error.value = 'Could not save milestone.'
        }
        throw exception
      }
    })
  } catch {
    // Button shows Failed.
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
    error.value = 'No free stamp threshold available to duplicate.'
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

function refreshIfVisible() {
  if (document.visibilityState === 'visible' && !formOpen.value) {
    loadRewards(true)
  }
}

function onImageChange(event: Event) {
  const input = event.target as HTMLInputElement
  revokeImagePreview()
  imageFile.value = input.files?.[0] ?? null
  if (imageFile.value) {
    removeImage.value = false
    imagePreviewUrl.value = URL.createObjectURL(imageFile.value)
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
  revokeImagePreview()
  if (successTimer) {
    window.clearTimeout(successTimer)
  }
})

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

    <!-- Owner milestone builder -->
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
              Avg unlock: {{ avgUnlockVisits || '—' }} stamps
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
        <EmptyState
          compact
          :icon="Store"
          title="Select a venue"
          description="Pick a specific venue in the sidebar filter to manage milestones."
        />
      </AppCard>

      <AppCard v-else-if="loading" wrapper-class="mt-4">
        <EmptyState compact title="Loading your rewards journey…" />
      </AppCard>

      <ErrorState
        v-else-if="error && !formOpen"
        class="mt-4"
        :message="error"
        :show-retry="!sortedOwnerRewards.length"
        @retry="loadRewards"
      />

      <AppCard v-else-if="error" wrapper-class="mt-4 border-red-200 bg-red-50">
        <p class="text-sm font-bold text-red-600">{{ error }}</p>
      </AppCard>

      <AppCard v-else-if="successMessage" wrapper-class="mt-4 border-emerald-200 bg-emerald-50">
        <p class="text-sm font-bold text-emerald-700">{{ successMessage }}</p>
      </AppCard>

      <!-- Same stamp + rewards layout guests see on Wallet -->
      <section v-if="hasProgramLayout" class="mt-6">
        <AppCard wrapper-class="border-slate-200 bg-white p-5 sm:p-6">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 class="text-xl font-black text-slate-950">Loyalty card layout</h2>
              <p class="mt-1 text-sm text-slate-500">
                This is how milestones appear on the guest wallet — {{ programMaxStamps }} stamp
                {{ programMaxStamps === 1 ? 'slot' : 'slots' }} per cycle
                <span v-if="formOpen && programCardMilestones.some(isDraftMilestone)"> (includes unsaved changes)</span>.
              </p>
            </div>
            <div class="w-full shrink-0 sm:max-w-[220px]">
              <label class="text-xs font-bold uppercase tracking-wide text-slate-400" for="program-preview-stamps">
                Preview progress
              </label>
              <div class="mt-2 flex items-center gap-3">
                <input
                  id="program-preview-stamps"
                  v-model.number="programPreviewStamps"
                  type="range"
                  min="0"
                  :max="programMaxStamps"
                  class="min-w-0 flex-1 accent-indigo-600"
                >
                <span class="w-12 text-right text-sm font-black text-indigo-600">{{ programPreviewStamps }}</span>
              </div>
            </div>
          </div>

          <div class="mt-5">
            <VenueLandingPreview
              :milestones="programCardMilestones"
              :stamps="programPreviewStamps"
            />
          </div>

          <div v-if="programCardMilestones.length" class="mt-5 space-y-2">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Milestones on the card</p>
            <div
              v-for="milestone in programCardMilestones"
              :key="`card-milestone-${milestone.id}-${milestone.required_stamps}`"
              class="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3"
              :class="isDraftMilestone(milestone) ? 'border-dashed border-indigo-300 bg-indigo-50/50' : ''"
            >
              <p class="min-w-0 truncate text-sm font-bold text-slate-800">
                {{ milestone.required_stamps }} stamps → {{ milestone.title }}
              </p>
              <div class="flex shrink-0 items-center gap-2">
                <AppBadge v-if="isDraftMilestone(milestone)" tone="blue">Unsaved</AppBadge>
                <AppBadge
                  v-else
                  :tone="programPreviewStamps >= milestone.required_stamps ? 'green' : 'amber'"
                >
                  {{ programPreviewStamps >= milestone.required_stamps ? 'Unlocked' : 'Locked' }}
                </AppBadge>
              </div>
            </div>
          </div>
        </AppCard>
      </section>

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
            {{ editingReward ? 'Update how guests unlock this reward.' : 'Pick a template or craft your own — achievable rewards drive repeat stamps.' }}
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
                {{ template.rewards.map((item) => `${item.required_stamps} stamps`).join(' → ') }}
              </p>
            </button>
          </div>
          <button type="button" class="mt-4 text-sm font-bold text-slate-500 hover:text-slate-800" @click="showTemplatePicker = false">
            Or build a custom milestone ↓
          </button>
        </div>

        <form class="space-y-6 p-5 sm:p-6" @submit.prevent="saveReward">
          <section class="space-y-4">
            <p class="text-xs font-bold uppercase tracking-wide text-slate-400">1. Reward details</p>
            <div class="grid gap-4 sm:grid-cols-[minmax(0,1fr)_132px]">
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
                <label class="text-sm font-bold text-slate-600" for="reward-stamps">Unlock after</label>
                <div class="relative mt-2">
                  <input
                    id="reward-stamps"
                    v-model.number="requiredStamps"
                    required
                    min="1"
                    max="100"
                    type="number"
                    class="h-12 w-full rounded-2xl border bg-slate-50 px-4 pr-14 text-sm font-medium outline-none focus:bg-white"
                    :class="fieldErrors.required_stamps ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-slate-400'"
                  >
                  <span class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">stamps</span>
                </div>
                <p v-if="fieldErrors.required_stamps" class="mt-1 text-xs font-semibold text-red-600">{{ fieldErrors.required_stamps }}</p>
              </div>
            </div>
            <div>
              <label class="text-sm font-bold text-slate-600" for="reward-description">Guest-facing description</label>
              <textarea
                id="reward-description"
                v-model="description"
                rows="2"
                class="mt-2 w-full rounded-2xl border bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:bg-white"
                :class="fieldErrors.description ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-slate-400'"
                placeholder="Reward regular guests with a free signature coffee they'll talk about."
              />
              <p v-if="fieldErrors.description" class="mt-1 text-xs font-semibold text-red-600">{{ fieldErrors.description }}</p>
            </div>
          </section>

          <section class="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
            <p class="text-xs font-bold uppercase tracking-wide text-slate-400">2. Reward visual</p>
            <p class="mt-1 text-sm text-slate-500">Guests see this on their loyalty card. JPG or PNG, max 5 MB.</p>
            <div class="mt-4 grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-start">
              <div class="reward-media-frame reward-media-frame--editor rounded-2xl border border-slate-200 bg-slate-100 shadow-inner">
                <img
                  :src="imagePreviewUrl ?? rewardImageUrl({
                    title: title || 'reward',
                    image: removeImage ? null : (editingReward?.image ?? null),
                    image_thumb: removeImage ? null : (editingReward?.image_thumb ?? null),
                  })"
                  alt=""
                  class="reward-media-img"
                >
              </div>
              <div class="flex flex-col gap-3">
                <p class="text-sm font-semibold text-slate-700">
                  {{ imageFile?.name ?? (removeImage ? 'Image will be removed on save' : (editingReward?.image ? 'Current milestone image' : 'No image yet — fallback will be used')) }}
                </p>
                <div class="flex flex-wrap gap-2">
                  <AppButton type="button" variant="secondary" size="sm" @click="openImagePicker">
                    {{ imageFile ? 'Replace image' : 'Upload image' }}
                  </AppButton>
                  <AppButton
                    v-if="imageFile || (editingReward?.image && !removeImage)"
                    type="button"
                    variant="ghost"
                    size="sm"
                    @click="clearImage"
                  >
                    Remove
                  </AppButton>
                </div>
                <p v-if="fieldErrors.image" class="text-xs font-semibold text-red-600">{{ fieldErrors.image }}</p>
              </div>
            </div>
          </section>

          <div class="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <AppButton type="button" variant="ghost" :disabled="saving || saveRewardAction.loading" @click="closeCreateForm">
              Cancel
            </AppButton>
            <AsyncActionButton
              type="submit"
              :idle-label="editingReward ? 'Save changes' : 'Create reward'"
              :loading-label="editingReward ? 'Saving…' : 'Creating…'"
              :success-label="editingReward ? 'Saved ✓' : 'Created ✓'"
              :loading="saveRewardAction.loading"
              :success="saveRewardAction.success"
              :error="saveRewardAction.error"
            />
          </div>
        </form>
      </div>

      <!-- Empty state -->
      <section
        v-if="!loading && !sortedOwnerRewards.length && !hasProgramLayout && !needsVenuePick && canEditRewards"
        class="mt-6 overflow-hidden rounded-3xl border border-dashed border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-8 text-center shadow-inner"
      >
        <div class="mx-auto grid size-14 place-items-center rounded-2xl bg-indigo-100 text-indigo-600 ring-1 ring-indigo-200/80">
          <Gift class="size-7" :stroke-width="1.75" aria-hidden="true" />
        </div>
        <h2 class="mt-4 text-3xl font-black text-slate-950">Create your first reward</h2>
        <p class="mx-auto mt-2 max-w-lg text-sm text-slate-600">
          Customers return more often when rewards feel achievable. Start with a 5-stamp win — guests love seeing progress move.
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

      <!-- Manage milestones -->
      <section v-if="!loading && sortedOwnerRewards.length && !needsVenuePick" class="mt-6">
        <div class="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 class="text-xl font-black text-slate-950">Manage milestones</h2>
            <p class="mt-1 text-sm text-slate-500">Edit, pause, or add rewards — the card layout above updates automatically.</p>
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
                <div class="reward-media-frame bg-slate-100">
                  <img :src="rewardThumbUrl(reward)" :alt="reward.title" class="reward-media-img milestone-card-img">
                  <div v-if="!rewardHasCustomImage(reward)" class="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-transparent" />
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
                      Unlock after {{ reward.required_stamps }} {{ reward.required_stamps === 1 ? 'stamp' : 'stamps' }}
                    </p>
                  </div>
                </div>
                <p class="mt-3 text-sm leading-relaxed text-slate-600">
                  {{ reward.description || 'Reward regular guests and make every stamp feel closer to something special.' }}
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
          <p class="relative mt-1 text-sm text-white/60">Unlocks after your first guest stamp.</p>
          <div class="relative mt-4 space-y-2 opacity-70">
            <div class="h-16 rounded-xl bg-white/10" />
            <div class="grid grid-cols-3 gap-2">
              <div class="h-10 rounded-lg bg-white/10" />
              <div class="h-10 rounded-lg bg-white/15" />
              <div class="h-10 rounded-lg bg-white/10" />
            </div>
          </div>
          <p class="relative mt-4 text-xs font-semibold text-cyan-200/80">Track repeat stamps • Busiest hours • Reward performance</p>
        </AppCard>
      </div>

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
          <div class="mx-auto max-w-md rounded-3xl border border-white/10 bg-white p-4 shadow-inner">
            <VenueLandingPreview
              v-if="programCardMilestones.length"
              :milestones="programCardMilestones"
              :stamps="programPreviewStamps"
            />
            <p v-else class="py-8 text-center text-sm text-slate-500">
              Add milestones to preview the card layout.
            </p>
          </div>
          <p class="mt-4 text-center text-sm text-white/70">
            Same stamp grid and reward list guests see in Wallet after they join {{ venue?.name ?? 'your venue' }}.
          </p>
        </div>
      </div>
    </div>
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

.reward-media-frame {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  background-color: #f1f5f9;
}

.reward-media-frame--editor {
  width: 180px;
  max-width: 100%;
  flex-shrink: 0;
}

.reward-media-frame--thumb {
  width: 2.5rem;
  aspect-ratio: 1 / 1;
  flex-shrink: 0;
}

.reward-media-img {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  object-fit: cover;
  object-position: center;
}

.milestone-card:hover .milestone-card-img {
  transform: scale(1.03);
}

.milestone-card-img {
  transition: transform 0.45s ease;
}

.reward-media-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  text-align: center;
  color: #fff;
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
