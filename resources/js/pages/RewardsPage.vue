<script setup lang="ts">
import { Gift, Plus, Store } from '@lucide/vue'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import GuestWalletCardPreview from '@/components/loyalty/GuestWalletCardPreview.vue'
import AsyncActionButton from '@/components/ui/AsyncActionButton.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import ImageCropUpload from '@/components/ui/ImageCropUpload.vue'
import AppShell from '@/layouts/AppShell.vue'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { api, ApiError, apiErrorMessage } from '@/lib/api'
import { rewardImageUrl } from '@/lib/rewardMedia'
import { toast } from '@/lib/toast'
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
const fieldErrors = ref<Record<string, string>>({})
const formOpen = ref(false)
const showTemplatePicker = ref(false)
const title = ref('')
const description = ref('')
const requiredStamps = ref(5)
const imageFile = ref<File | null>(null)
const imagePreviewUrl = ref<string | null>(null)
const titleInput = ref<HTMLInputElement | null>(null)
const removeImage = ref(false)
const editingReward = ref<Reward | null>(null)
const deleteRewardTarget = ref<Reward | null>(null)
let refreshTimer: number | undefined

const needsVenuePick = computed(
  () => workspace.activeVenues.length > 1 && workspace.effectiveVenueId === null,
)
const imageCropDisabled = computed(() => saving.value || saveRewardAction.loading.value)

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
  action: 'edit' | 'archive' | 'reactivate' | 'delete',
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
}

function suggestedNextStamp(): number {
  const existing = new Set(rewards.value.map((reward) => reward.required_stamps))
  let candidate = 5
  while (existing.has(candidate) && candidate <= 100) {
    candidate += 1
  }
  return candidate
}

function onRewardImageCrop(file: File) {
  revokeImagePreview()
  imageFile.value = file
  removeImage.value = false
  imagePreviewUrl.value = URL.createObjectURL(file)
}

function clearImage() {
  imageFile.value = null
  revokeImagePreview()
  removeImage.value = true
  toast.info('Image will be removed when you save.')
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
    toast.error('A milestone already exists for this stamp threshold.')
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
        toast.success(wasEditing ? 'Milestone updated' : 'Milestone created')
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

function milestoneExistsAt(requiredStamps: number): boolean {
  return rewards.value.some((reward) => reward.required_stamps === requiredStamps)
}

async function createRewardFromPreset(
  templateReward: RewardTemplate['rewards'][number],
): Promise<boolean> {
  if (!venue.value || milestoneExistsAt(templateReward.required_stamps)) {
    return false
  }

  const body = new FormData()
  body.append('title', templateReward.title)
  body.append('required_stamps', String(templateReward.required_stamps))
  body.append('description', templateReward.description)
  body.append('active', '1')
  await api<{ reward: Reward }>(`/venues/${venue.value.id}/rewards`, { method: 'POST', body })

  return true
}

async function applyTemplateReward(
  templateReward: RewardTemplate['rewards'][number],
) {
  if (!venue.value) return

  if (milestoneExistsAt(templateReward.required_stamps)) {
    toast.message(`You already have a milestone at ${templateReward.required_stamps} stamps`)
    return
  }

  saving.value = true
  error.value = ''

  try {
    const created = await createRewardFromPreset(templateReward)
    if (!created) {
      return
    }

    await loadRewards()
    formOpen.value = false
    showTemplatePicker.value = false
    toast.success(`Added "${templateReward.title}" (${templateReward.required_stamps} stamps)`)
  } catch (exception) {
    toast.error(exception instanceof ApiError ? exception.message : 'Could not add milestone.')
  } finally {
    saving.value = false
  }
}

async function applyTemplate(template: RewardTemplate) {
  if (!venue.value) return
  saving.value = true
  error.value = ''
  let created = 0

  try {
    for (const templateReward of template.rewards) {
      if (await createRewardFromPreset(templateReward)) {
        created += 1
      }
    }
    await loadRewards()
    formOpen.value = false
    showTemplatePicker.value = false
    if (created) {
      toast.success(`Added all ${created} milestones from ${template.name}`)
    } else {
      toast.message('Those milestones already exist')
    }
  } catch (exception) {
    toast.error(exception instanceof ApiError ? exception.message : 'Could not apply template.')
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
    toast.success('Milestone archived')
  } catch (exception) {
    toast.error(exception instanceof ApiError ? exception.message : 'Could not archive milestone.')
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
    toast.success('Milestone reactivated')
  } catch (exception) {
    toast.error(exception instanceof ApiError ? exception.message : 'Could not reactivate milestone.')
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
    toast.success('Milestone deleted')
  } catch (exception) {
    toast.error(exception instanceof ApiError ? exception.message : 'Could not delete milestone.')
  } finally {
    saving.value = false
  }
}

function refreshIfVisible() {
  if (document.visibilityState === 'visible' && !formOpen.value) {
    loadRewards(true)
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
})

watch(() => workspace.filterVenueId, () => loadRewards())
watch(() => route.query.reward_id, () => applyRouteEditingIntent())
</script>

<template>
  <AppShell>
    <PageHeader
      title="Rewards"
      badge="Milestones"
      description="Design milestone rewards that turn occasional guests into loyal regulars."
    >
      <template v-if="!needsVenuePick && venue" #meta>
        <span class="text-sm font-semibold text-ink-soft">
          {{ activeRewardCount }} active · avg unlock {{ avgUnlockVisits || '—' }} stamps · {{ venue.name }}
        </span>
      </template>
      <template v-if="canEditRewards" #actions>
        <AppButton @click="openCreateForm">
          <Plus class="size-4" />
          Create milestone
        </AppButton>
      </template>
    </PageHeader>

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

      <!-- Create / edit panel -->
      <div
        v-if="formOpen && canEditRewards && !needsVenuePick"
        class="mt-4 overflow-hidden rounded-3xl border border-border bg-surface shadow-xl shadow-border/60"
      >
        <div class="border-b border-border bg-gradient-to-r from-surface-muted to-surface px-5 py-4 sm:px-6">
          <h2 class="text-lg font-black text-ink">
            {{ editingReward ? 'Edit milestone' : 'Create a collectible milestone' }}
          </h2>
          <p class="mt-1 text-sm text-ink-muted">
            {{ editingReward ? 'Update how guests unlock this reward.' : 'Pick a template or craft your own — achievable rewards drive repeat stamps.' }}
          </p>
        </div>

        <div
          v-if="error"
          class="border-b border-danger/30 bg-danger-soft px-5 py-3 text-sm font-bold text-danger sm:px-6"
        >
          {{ error }}
        </div>

        <div v-if="!editingReward" class="border-b border-border px-5 py-3 sm:px-6">
          <button
            type="button"
            class="text-sm font-bold text-primary hover:text-primary"
            @click="showTemplatePicker = !showTemplatePicker"
          >
            {{ showTemplatePicker ? 'Hide templates' : 'Start from a template' }}
          </button>
        </div>

        <div v-if="showTemplatePicker && !editingReward" class="border-b border-border p-5 sm:p-6">
          <p class="text-xs font-bold uppercase tracking-wide text-ink-soft">Starter packs</p>
          <p class="mt-1 text-sm text-ink-muted">
            Add one milestone at a time, or apply the full pack. Each pack is a suggested program — not a single reward.
          </p>
          <div class="mt-3 grid gap-3 md:grid-cols-3">
            <div
              v-for="template in rewardTemplates"
              :key="template.id"
              class="template-card rounded-2xl border border-border bg-surface-muted p-4 text-left"
            >
              <p class="text-2xl">{{ template.emoji }}</p>
              <p class="mt-2 font-black text-ink">{{ template.name }}</p>
              <p class="mt-1 text-xs text-ink-muted">{{ template.description }}</p>
              <ul class="mt-3 space-y-2">
                <li
                  v-for="templateReward in template.rewards"
                  :key="`${template.id}-${templateReward.required_stamps}`"
                  class="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3 py-2"
                >
                  <div class="min-w-0">
                    <p class="truncate text-sm font-bold text-ink">{{ templateReward.title }}</p>
                    <p class="text-xs text-ink-muted">{{ templateReward.required_stamps }} stamps</p>
                  </div>
                  <AppButton
                    type="button"
                    size="sm"
                    variant="secondary"
                    :disabled="saving || milestoneExistsAt(templateReward.required_stamps)"
                    @click="applyTemplateReward(templateReward)"
                  >
                    {{ milestoneExistsAt(templateReward.required_stamps) ? 'Added' : 'Add' }}
                  </AppButton>
                </li>
              </ul>
              <AppButton
                type="button"
                size="sm"
                class="mt-3 w-full"
                :disabled="saving"
                @click="applyTemplate(template)"
              >
                Add all {{ template.rewards.length }} milestones
              </AppButton>
            </div>
          </div>
          <button type="button" class="mt-4 text-sm font-bold text-ink-muted hover:text-ink" @click="showTemplatePicker = false">
            Or build a custom milestone ↓
          </button>
        </div>

        <form class="space-y-6 p-5 sm:p-6" @submit.prevent="saveReward">
          <section class="space-y-4">
            <p class="text-xs font-bold uppercase tracking-wide text-ink-soft">1. Reward details</p>
            <div class="grid gap-4 sm:grid-cols-[minmax(0,1fr)_132px]">
              <div>
                <label class="text-sm font-bold text-ink-muted" for="reward-title">Reward title</label>
                <input
                  id="reward-title"
                  ref="titleInput"
                  v-model="title"
                  required
                  class="mt-2 h-12 w-full rounded-2xl border bg-surface-muted px-4 text-sm font-medium outline-none focus:bg-surface"
                  :class="fieldErrors.title ? 'border-danger focus:border-danger' : 'border-border focus:border-ink-soft'"
                  placeholder="Free signature coffee"
                >
                <p v-if="fieldErrors.title" class="mt-1 text-xs font-semibold text-danger">{{ fieldErrors.title }}</p>
              </div>
              <div>
                <label class="text-sm font-bold text-ink-muted" for="reward-stamps">Unlock after</label>
                <div class="relative mt-2">
                  <input
                    id="reward-stamps"
                    v-model.number="requiredStamps"
                    required
                    min="1"
                    max="100"
                    type="number"
                    class="h-12 w-full rounded-2xl border bg-surface-muted px-4 pr-14 text-sm font-medium outline-none focus:bg-surface"
                    :class="fieldErrors.required_stamps ? 'border-danger focus:border-danger' : 'border-border focus:border-ink-soft'"
                  >
                  <span class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-soft">stamps</span>
                </div>
                <p v-if="fieldErrors.required_stamps" class="mt-1 text-xs font-semibold text-danger">{{ fieldErrors.required_stamps }}</p>
              </div>
            </div>
            <div>
              <label class="text-sm font-bold text-ink-muted" for="reward-description">Guest-facing description</label>
              <textarea
                id="reward-description"
                v-model="description"
                rows="2"
                class="mt-2 w-full rounded-2xl border bg-surface-muted px-4 py-3 text-sm font-medium outline-none focus:bg-surface"
                :class="fieldErrors.description ? 'border-danger focus:border-danger' : 'border-border focus:border-ink-soft'"
                placeholder="Reward regular guests with a free signature coffee they'll talk about."
              />
              <p v-if="fieldErrors.description" class="mt-1 text-xs font-semibold text-danger">{{ fieldErrors.description }}</p>
            </div>
          </section>

          <section class="rounded-2xl border border-border bg-surface-muted/80 p-4 sm:p-5">
            <p class="text-xs font-bold uppercase tracking-wide text-ink-soft">2. Reward visual</p>
            <p class="mt-1 text-sm text-ink-muted">Square crop for the loyalty card. JPG or PNG, max 5 MB.</p>
            <div class="mt-4 grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-start">
              <div class="reward-media-frame reward-media-frame--editor rounded-2xl border border-border bg-surface-muted shadow-inner">
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
                <p class="text-sm font-semibold text-ink-muted">
                  {{ imageFile?.name ?? (removeImage ? 'Image will be removed on save' : (editingReward?.image ? 'Current milestone image' : 'No image yet — fallback will be used')) }}
                </p>
                <div class="flex flex-wrap gap-2">
                  <ImageCropUpload
                    preset="square"
                    modal-title="Crop reward image"
                    :disabled="imageCropDisabled"
                    @crop="onRewardImageCrop"
                  >
                    <template #default="{ open }">
                      <AppButton type="button" variant="secondary" size="sm" @click="open">
                        {{ imageFile ? 'Replace image' : 'Upload image' }}
                      </AppButton>
                    </template>
                  </ImageCropUpload>
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
                <p v-if="fieldErrors.image" class="text-xs font-semibold text-danger">{{ fieldErrors.image }}</p>
              </div>
            </div>
          </section>

          <div class="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
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
        <AppCard wrapper-class="overflow-hidden border-border/90 bg-surface p-0">
          <div class="border-b border-border bg-surface-muted/90 px-5 py-4 sm:px-6">
            <p class="text-xs font-semibold uppercase tracking-wide text-primary">Customer Card Preview</p>
            <h2 class="mt-1 text-xl font-semibold tracking-tight text-ink sm:text-2xl">Loyalty card</h2>
            <p class="mt-1 max-w-2xl text-sm text-ink-muted">
              This is how customers will see your loyalty card.
              <template v-if="programMaxStamps > 0">
                {{ programMaxStamps }} positions per cycle — numbered slots are stamps, cards are rewards.
              </template>
            </p>
          </div>

          <div class="bg-gradient-to-b from-surface-muted/40 via-surface to-surface px-3 py-5 sm:px-6 sm:py-6 lg:px-8">
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

          <div v-if="pausedRewards.length && canEditRewards" class="border-t border-border px-5 py-4 sm:px-6">
            <p class="text-xs font-bold uppercase tracking-wide text-ink-soft">Paused milestones</p>
            <div class="mt-2 flex flex-wrap gap-2">
              <button
                v-for="reward in pausedRewards"
                :key="`paused-${reward.id}`"
                type="button"
                class="rounded-full border border-border bg-surface-muted px-3 py-1.5 text-xs font-semibold text-ink-muted transition hover:border-accent-border hover:bg-accent-soft hover:text-primary"
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
        class="mt-6 overflow-hidden rounded-3xl border border-dashed border-accent-border bg-gradient-to-br from-accent-soft via-surface to-cyan-50 p-8 text-center shadow-inner"
      >
        <div class="mx-auto grid size-14 place-items-center rounded-2xl bg-accent-soft text-primary ring-1 ring-accent-border/80">
          <Gift class="size-7" :stroke-width="1.75" aria-hidden="true" />
        </div>
        <h2 class="mt-4 text-3xl font-black text-ink">Create your first reward</h2>
        <p class="mx-auto mt-2 max-w-lg text-sm text-ink-muted">
          Customers return more often when rewards feel achievable. Start with a 5-stamp win — guests love seeing progress move.
        </p>
        <div class="mt-6 flex flex-wrap justify-center gap-2">
          <AppButton @click="openCreateForm">Create first milestone</AppButton>
        </div>
        <div class="mt-8 grid gap-3 text-left md:grid-cols-3">
          <div
            v-for="template in rewardTemplates"
            :key="`empty-${template.id}`"
            class="rounded-2xl border border-white bg-surface/80 p-4 shadow-sm"
          >
            <p class="text-2xl">{{ template.emoji }}</p>
            <p class="mt-2 font-black text-ink">{{ template.name }}</p>
            <p class="mt-1 text-xs text-ink-muted">{{ template.rewards.length }} suggested milestones</p>
            <ul class="mt-3 space-y-1.5 text-left">
              <li
                v-for="templateReward in template.rewards"
                :key="`empty-${template.id}-${templateReward.required_stamps}`"
                class="flex items-center justify-between gap-2 text-xs"
              >
                <span class="font-semibold text-ink">{{ templateReward.title }}</span>
                <button
                  type="button"
                  class="shrink-0 font-bold text-primary hover:underline disabled:text-ink-soft disabled:no-underline"
                  :disabled="saving || milestoneExistsAt(templateReward.required_stamps)"
                  @click="applyTemplateReward(templateReward)"
                >
                  {{ milestoneExistsAt(templateReward.required_stamps) ? 'Added' : 'Add' }}
                </button>
              </li>
            </ul>
            <AppButton
              type="button"
              size="sm"
              variant="secondary"
              class="mt-3 w-full"
              :disabled="saving"
              @click="applyTemplate(template)"
            >
              Add all {{ template.rewards.length }}
            </AppButton>
          </div>
        </div>
      </section>


    <!-- Delete confirmation -->
    <div
      v-if="deleteRewardTarget"
      class="fixed inset-0 z-40 grid place-items-center bg-primary/40 px-4 backdrop-blur-sm"
      @click.self="closeDeleteModal"
    >
      <AppCard wrapper-class="w-full max-w-md border-border bg-surface p-6">
        <h2 class="text-2xl font-black text-ink">Delete milestone?</h2>
        <p class="mt-2 text-sm text-ink-muted">
          This permanently removes <span class="font-bold text-ink">{{ deleteRewardTarget.title }}</span>.
        </p>
        <div class="mt-5 grid gap-2 sm:grid-cols-2">
          <AppButton variant="secondary" :disabled="saving" @click="closeDeleteModal">Cancel</AppButton>
          <AppButton :disabled="saving" class="bg-danger text-primary-text hover:bg-danger/90" @click="deleteReward(deleteRewardTarget)">
            {{ saving ? 'Deleting...' : 'Yes, delete' }}
          </AppButton>
        </div>
      </AppCard>
    </div>

  </AppShell>
</template>

<style scoped>
.reward-media-frame {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
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

</style>
