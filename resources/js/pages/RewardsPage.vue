<script setup lang="ts">
import { Gift, Store } from '@lucide/vue'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import GuestWalletCardPreview from '@/components/loyalty/GuestWalletCardPreview.vue'
import AsyncActionButton from '@/components/ui/AsyncActionButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import AppShell from '@/layouts/AppShell.vue'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { api, ApiError, apiErrorMessage } from '@/lib/api'
import { rewardImageUrl } from '@/lib/rewardMedia'
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
    active: reward.active,
    isDraft: false,
  }))

  if (!formOpen.value || !title.value.trim() || requiredStamps.value < 1) {
    return items
  }

  const isEditingDraft = Boolean(
    editingReward.value && (
      title.value.trim() !== editingReward.value.title
      || description.value.trim() !== (editingReward.value.description ?? '')
      || requiredStamps.value !== editingReward.value.required_stamps
      || imageFile.value
      || removeImage.value
    ),
  )

  const draft = {
    id: editingReward.value?.id ?? -1,
    title: title.value.trim(),
    description: description.value.trim() || null,
    image: editingReward.value?.image ?? null,
    image_thumb: editingReward.value?.image_thumb ?? null,
    required_stamps: requiredStamps.value,
    isDraft: true,
  }

  if (editingReward.value) {
    return items
      .map((milestone) => (milestone.id === editingReward.value!.id
        ? { ...draft, id: milestone.id, isDraft: isEditingDraft }
        : milestone))
      .sort((a, b) => a.required_stamps - b.required_stamps)
  }

  return [...items, draft].sort((a, b) => a.required_stamps - b.required_stamps)
})

const programMaxStamps = computed(() => programCardMilestones.value.at(-1)?.required_stamps ?? 0)

const pausedRewards = computed(() => sortedOwnerRewards.value.filter((reward) => !reward.active))

const selectedGridMilestoneId = computed(() => editingReward.value?.id ?? null)

function rewardById(milestoneId: number): Reward | undefined {
  return rewards.value.find((reward) => reward.id === milestoneId)
}

function onGridMenuAction(
  action: 'edit' | 'duplicate' | 'archive' | 'reactivate' | 'delete',
  milestoneId: number,
) {
  const reward = rewardById(milestoneId)
  if (!reward) {
    return
  }

  if (action === 'edit') {
    startEditing(reward)
    return
  }
  if (action === 'duplicate') {
    void duplicateReward(reward)
    return
  }
  if (action === 'archive') {
    void archiveReward(reward)
    return
  }
  if (action === 'reactivate') {
    void reactivateReward(reward)
    return
  }
  if (action === 'delete') {
    openDeleteModal(reward)
  }
}

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

function startEditing(reward: Reward) {
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
  showTemplatePicker.value = false
  requiredStamps.value = suggestedNextStamp()
  fieldErrors.value = {}
  error.value = ''
  nextTick(() => {
    titleInput.value?.focus()
    titleInput.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
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

        const wasEditing = Boolean(editingReward.value)

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
        await loadRewards(true)
        showSuccess(wasEditing ? 'Milestone updated.' : 'Milestone created.')
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

      <AppCard v-else-if="error && !formOpen" wrapper-class="mt-4 border-red-200 bg-red-50">
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
            {{ editingReward ? 'Update how guests unlock this reward.' : 'Pick a template or craft your own — achievable rewards drive repeat stamps.' }}
          </p>
        </div>

        <div
          v-if="error"
          class="border-b border-red-100 bg-red-50 px-5 py-3 text-sm font-bold text-red-600 sm:px-6"
        >
          {{ error }}
        </div>

        <div v-if="!editingReward" class="border-b border-slate-100 px-5 py-3 sm:px-6">
          <button
            type="button"
            class="text-sm font-bold text-indigo-600 hover:text-indigo-800"
            @click="showTemplatePicker = !showTemplatePicker"
          >
            {{ showTemplatePicker ? 'Hide templates' : 'Start from a template' }}
          </button>
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

      <!-- Customer card preview -->
      <section v-if="!loading && !needsVenuePick" class="mt-6">
        <AppCard wrapper-class="overflow-hidden border-slate-200/90 bg-white p-0">
          <div class="border-b border-slate-100 bg-slate-50/90 px-5 py-4 sm:px-6">
            <p class="text-xs font-semibold uppercase tracking-wide text-indigo-600">Customer Card Preview</p>
            <h2 class="mt-1 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">Loyalty card</h2>
            <p class="mt-1 max-w-2xl text-sm text-slate-500">
              This is how customers will see your loyalty card.
              <template v-if="programMaxStamps > 0">
                {{ programMaxStamps }} positions per cycle — numbered slots are stamps, cards are rewards.
              </template>
            </p>
          </div>

          <div class="bg-gradient-to-b from-slate-50/40 via-white to-white px-3 py-5 sm:px-6 sm:py-6 lg:px-8">
            <GuestWalletCardPreview
              variant="prominent"
              :milestones="programCardMilestones"
              :venue-name="venue?.name"
              :editable="canEditRewards"
              :selected-milestone-id="selectedGridMilestoneId"
              :menu-saving="saving"
              @menu-action="onGridMenuAction"
            />
          </div>

          <div v-if="pausedRewards.length && canEditRewards" class="border-t border-slate-100 px-5 py-4 sm:px-6">
            <p class="text-xs font-bold uppercase tracking-wide text-slate-400">Paused milestones</p>
            <div class="mt-2 flex flex-wrap gap-2">
              <button
                v-for="reward in pausedRewards"
                :key="`paused-${reward.id}`"
                type="button"
                class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-800"
                @click="startEditing(reward)"
              >
                {{ reward.required_stamps }} · {{ reward.title }}
              </button>
            </div>
          </div>
        </AppCard>
      </section>

      <!-- Empty state -->
      <section
        v-if="!loading && !sortedOwnerRewards.length && !needsVenuePick && canEditRewards"
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

  </AppShell>
</template>

<style scoped>
.journey-hero-glow {
  animation: ambient-drift 8s ease-in-out infinite alternate;
}

.hero-cta {
  box-shadow: 0 8px 24px rgba(255, 255, 255, 0.15);
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

@keyframes ambient-drift {
  from {
    transform: translate(0, 0) scale(1);
  }
  to {
    transform: translate(12px, -8px) scale(1.08);
  }
}
</style>
