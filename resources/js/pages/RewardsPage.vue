<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import CustomerRewardWallet from '@/components/loyalty/CustomerRewardWallet.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppShell from '@/layouts/AppShell.vue'
import { api, ApiError } from '@/lib/api'
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
  requiredStamps.value = 5
  imageFile.value = null
  removeImage.value = false
  editingReward.value = null
  fieldErrors.value = {}
  if (imageInput.value) {
    imageInput.value.value = ''
  }
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

function startEditing(reward: Reward) {
  formOpen.value = true
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

function toggleMilestoneForm() {
  if (!formOpen.value && needsVenuePick.value) {
    error.value = 'Select a specific venue in the sidebar filter first.'
    return
  }

  if (editingReward.value) {
    resetForm()
  }
  fieldErrors.value = {}
  formOpen.value = !formOpen.value
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

async function deleteReward(reward: Reward) {
  if (!venue.value) return
  if (!window.confirm(`Delete "${reward.title}" permanently? This cannot be undone.`)) return

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
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <AppBadge tone="blue">{{ canManageRewards ? 'Milestone builder' : 'Progress journey' }}</AppBadge>
        <h1 class="mt-3 text-4xl font-black tracking-tight text-slate-950">Rewards Journey</h1>
        <p class="mt-2 text-slate-500">Unlock milestones as customers keep visiting. Progress never goes backwards.</p>
      </div>
      <AppButton v-if="canEditRewards" @click="toggleMilestoneForm">
        {{ formOpen ? 'Close' : 'Create milestone' }}
      </AppButton>
    </div>
    <input
      ref="imageInput"
      type="file"
      accept="image/png,image/jpeg,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
      class="hidden"
      @change="onImageChange"
    >

    <AppCard v-if="formOpen && canEditRewards && !needsVenuePick && !editingReward" wrapper-class="mb-4 pb-8">
      <form class="grid gap-4 md:grid-cols-2" @submit.prevent="saveReward">
        <div>
          <label class="text-sm font-bold text-slate-600" for="reward-title">Milestone title</label>
          <input id="reward-title" ref="titleInput" v-model="title" required class="mt-2 h-12 w-full rounded-2xl border bg-slate-50 px-4 text-sm font-medium outline-none focus:bg-white" :class="fieldErrors.title ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-slate-400'" placeholder="Free Ice Cream">
          <p v-if="fieldErrors.title" class="mt-1 text-xs font-semibold text-red-600">{{ fieldErrors.title }}</p>
        </div>
        <div>
          <label class="text-sm font-bold text-slate-600" for="reward-stamps">Unlock at visits</label>
          <input id="reward-stamps" v-model.number="requiredStamps" required min="1" max="100" type="number" class="mt-2 h-12 w-full rounded-2xl border bg-slate-50 px-4 text-sm font-medium outline-none focus:bg-white" :class="fieldErrors.required_stamps ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-slate-400'">
          <p v-if="fieldErrors.required_stamps" class="mt-1 text-xs font-semibold text-red-600">{{ fieldErrors.required_stamps }}</p>
        </div>
        <div class="relative z-30 md:col-span-2">
          <label class="text-sm font-bold text-slate-600">Image (optional)</label>
          <p class="mt-1 text-xs font-medium text-slate-400">Add a photo for this milestone card.</p>
          <div class="mt-2 flex flex-wrap items-center gap-2">
            <AppButton type="button" variant="secondary" size="sm" @click="openImagePicker">
              {{ imageFile ? 'Replace image' : 'Upload image' }}
            </AppButton>
            <AppButton v-if="imageFile" type="button" variant="ghost" size="sm" @click="clearImage">
              Remove
            </AppButton>
            <p class="text-sm font-semibold text-slate-500">
              {{ imageFile?.name ?? (removeImage ? 'Image will be removed' : 'No image selected') }}
            </p>
          </div>
          <p v-if="fieldErrors.image" class="mt-1 text-xs font-semibold text-red-600">{{ fieldErrors.image }}</p>
        </div>
        <div class="md:col-span-2">
          <label class="text-sm font-bold text-slate-600" for="reward-description">Description (optional)</label>
          <textarea id="reward-description" v-model="description" class="mt-2 w-full rounded-2xl border bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:bg-white" :class="fieldErrors.description ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-slate-400'" rows="3" placeholder="Describe the milestone reward." />
          <p v-if="fieldErrors.description" class="mt-1 text-xs font-semibold text-red-600">{{ fieldErrors.description }}</p>
        </div>
        <div class="pb-20 md:col-span-2 md:pb-0">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
            <AppButton class="w-full sm:w-auto" type="submit" :disabled="saving">
              {{ saving ? 'Saving...' : (editingReward ? 'Save changes' : 'Save milestone') }}
            </AppButton>
            <AppButton type="button" variant="ghost" class="w-full sm:w-auto" :disabled="saving" @click="() => { resetForm(); formOpen = false }">
              Cancel
            </AppButton>
          </div>
        </div>
      </form>
    </AppCard>

    <AppCard v-if="canEditRewards && needsVenuePick" wrapper-class="mb-4">
      <p class="text-sm font-bold text-slate-500">Select a specific venue in the sidebar filter to manage milestones.</p>
    </AppCard>
    <AppCard v-else-if="!canManageRewards && journey" wrapper-class="mb-4 bg-slate-950 text-white">
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
    <AppCard v-else-if="successMessage" wrapper-class="mb-4 border-emerald-200 bg-emerald-50">
      <p class="text-sm font-bold text-emerald-700">{{ successMessage }}</p>
    </AppCard>

    <div class="grid gap-4 md:grid-cols-2">
      <AppCard
        v-for="milestone in milestones"
        :key="milestone.id"
        :wrapper-class="!canManageRewards ? 'cursor-pointer transition hover:-translate-y-0.5 hover:shadow-xl' : ''"
        @click="openCustomerReward(rewards.find((item) => item.id === milestone.id))"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-2xl font-black text-slate-950">{{ milestone.title }}</h2>
            <p class="mt-1 text-sm font-semibold text-slate-500">{{ milestone.required_stamps }} visits milestone</p>
            <p v-if="milestone.description" class="mt-2 text-sm text-slate-500">{{ milestone.description }}</p>
          </div>
          <AppBadge :tone="milestone.claimed ? 'blue' : (milestone.unlocked ? 'green' : 'amber')">
            {{ milestone.claimed ? 'Claimed' : (milestone.unlocked ? 'Unlocked' : 'Locked') }}
          </AppBadge>
        </div>
        <div v-if="milestone.image" class="mt-4 overflow-hidden rounded-2xl">
          <img :src="milestone.image" alt="" class="h-36 w-full object-cover">
        </div>
        <AppButton
          v-if="canEditRewards && milestone.active"
          class="mt-5"
          variant="secondary"
          size="sm"
          :disabled="saving"
          @click.stop="archiveReward(rewards.find((item) => item.id === milestone.id) as Reward)"
        >
          Archive
        </AppButton>
        <AppButton
          v-if="canEditRewards"
          class="mt-2"
          variant="ghost"
          size="sm"
          :disabled="saving"
          @click.stop="startEditing(rewards.find((item) => item.id === milestone.id) as Reward)"
        >
          Edit
        </AppButton>
        <AppButton
          v-if="canEditRewards && !milestone.active"
          class="mt-2"
          variant="secondary"
          size="sm"
          :disabled="saving"
          @click.stop="reactivateReward(rewards.find((item) => item.id === milestone.id) as Reward)"
        >
          Reactivate
        </AppButton>
        <AppButton
          v-if="canEditRewards && !milestone.active"
          class="mt-2"
          variant="ghost"
          size="sm"
          :disabled="saving"
          @click.stop="deleteReward(rewards.find((item) => item.id === milestone.id) as Reward)"
        >
          Delete
        </AppButton>
        <form
          v-if="canEditRewards && editingReward?.id === milestone.id"
          class="mt-5 grid gap-4 border-t border-slate-200 pt-4"
          @submit.prevent="saveReward"
        >
          <div>
            <label class="text-sm font-bold text-slate-600" for="reward-title-inline">Milestone title</label>
            <input id="reward-title-inline" ref="titleInput" v-model="title" required class="mt-2 h-11 w-full rounded-2xl border bg-slate-50 px-4 text-sm font-medium outline-none focus:bg-white" :class="fieldErrors.title ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-slate-400'">
            <p v-if="fieldErrors.title" class="mt-1 text-xs font-semibold text-red-600">{{ fieldErrors.title }}</p>
          </div>
          <div>
            <label class="text-sm font-bold text-slate-600" for="reward-stamps-inline">Unlock at visits</label>
            <input id="reward-stamps-inline" v-model.number="requiredStamps" required min="1" max="100" type="number" class="mt-2 h-11 w-full rounded-2xl border bg-slate-50 px-4 text-sm font-medium outline-none focus:bg-white" :class="fieldErrors.required_stamps ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-slate-400'">
            <p v-if="fieldErrors.required_stamps" class="mt-1 text-xs font-semibold text-red-600">{{ fieldErrors.required_stamps }}</p>
          </div>
          <div>
            <label class="text-sm font-bold text-slate-600">Image (optional)</label>
            <div v-if="editingReward?.image && !removeImage && !imageFile" class="mt-2 overflow-hidden rounded-2xl border border-slate-200">
              <img :src="editingReward.image" alt="" class="h-28 w-full object-cover">
            </div>
            <div class="mt-2 flex flex-wrap items-center gap-2">
              <AppButton type="button" size="sm" variant="secondary" @click="openImagePicker">
                {{ imageFile ? 'Replace image' : 'Upload image' }}
              </AppButton>
              <AppButton v-if="imageFile || (editingReward?.image && !removeImage)" type="button" size="sm" variant="ghost" @click="clearImage">
                Remove
              </AppButton>
              <p class="text-sm font-semibold text-slate-500">
                {{ imageFile?.name ?? (removeImage ? 'Image will be removed' : (editingReward?.image ? 'Current image' : 'No image selected')) }}
              </p>
            </div>
            <p v-if="fieldErrors.image" class="mt-1 text-xs font-semibold text-red-600">{{ fieldErrors.image }}</p>
          </div>
          <div>
            <label class="text-sm font-bold text-slate-600" for="reward-description-inline">Description (optional)</label>
            <textarea id="reward-description-inline" v-model="description" rows="3" class="mt-2 w-full rounded-2xl border bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:bg-white" :class="fieldErrors.description ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-slate-400'" />
            <p v-if="fieldErrors.description" class="mt-1 text-xs font-semibold text-red-600">{{ fieldErrors.description }}</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <AppButton size="sm" type="submit" :disabled="saving">
              {{ saving ? 'Saving...' : 'Save changes' }}
            </AppButton>
            <AppButton size="sm" type="button" variant="ghost" :disabled="saving" @click="() => { resetForm(); formOpen = false }">
              Cancel
            </AppButton>
          </div>
        </form>
        <p v-else-if="!canManageRewards" class="mt-5 text-sm font-bold text-slate-500">
          {{ milestone.unlocked && !milestone.claimed ? 'Tap to claim milestone reward' : 'Keep progressing to unlock' }}
        </p>
      </AppCard>
      <AppCard v-if="!loading && !milestones.length">
        <p class="text-sm font-semibold text-slate-500">No milestones yet.</p>
      </AppCard>
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
