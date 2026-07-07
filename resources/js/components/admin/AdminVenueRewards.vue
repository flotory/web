<script setup lang="ts">
import { Gift, Plus, Trash2 } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'

import AsyncActionButton from '@/components/ui/AsyncActionButton.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import ImageCropUpload from '@/components/ui/ImageCropUpload.vue'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { api, apiErrorMessage } from '@/lib/api'
import { rewardImageUrl } from '@/lib/rewardMedia'
import { toast } from '@/lib/toast'
import type { Reward } from '@/types'

const props = defineProps<{
  venueId: number
}>()

const emit = defineEmits<{
  changed: []
}>()

const loading = ref(true)
const error = ref('')
const rewards = ref<Reward[]>([])
const formOpen = ref(false)
const editingReward = ref<Reward | null>(null)
const title = ref('')
const description = ref('')
const requiredStamps = ref(5)
const imageFile = ref<File | null>(null)
const imagePreviewUrl = ref<string | null>(null)
const removeImage = ref(false)
const saveRewardAction = useAsyncAction()

const sortedRewards = computed(() =>
  [...rewards.value].sort((a, b) => a.required_stamps - b.required_stamps),
)

const apiBase = computed(() => `/admin/manage-venues/${props.venueId}/rewards`)

function suggestedNextStamp(): number {
  const existing = new Set(rewards.value.map((reward) => reward.required_stamps))
  let candidate = 5
  while (existing.has(candidate) && candidate <= 100) {
    candidate += 1
  }
  return candidate
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
}

function openCreateForm() {
  resetForm()
  formOpen.value = true
}

function startEditing(reward: Reward) {
  formOpen.value = true
  editingReward.value = reward
  title.value = reward.title
  description.value = reward.description ?? ''
  requiredStamps.value = reward.required_stamps
  imageFile.value = null
  removeImage.value = false
  revokeImagePreview()
}

function closeForm() {
  resetForm()
  formOpen.value = false
}

function onRewardImageCrop(file: File) {
  revokeImagePreview()
  imageFile.value = file
  removeImage.value = false
  imagePreviewUrl.value = URL.createObjectURL(file)
}

async function loadRewards() {
  loading.value = true
  error.value = ''

  try {
    const response = await api<{ rewards: Reward[] }>(apiBase.value)
    rewards.value = response.rewards
  } catch (exception) {
    error.value = apiErrorMessage(exception, 'Could not load rewards.')
  } finally {
    loading.value = false
  }
}

async function saveReward() {
  const duplicate = rewards.value.some(
    (reward) => reward.required_stamps === requiredStamps.value && reward.id !== editingReward.value?.id,
  )

  if (duplicate) {
    toast.error('A milestone already exists for this stamp threshold.')
    return
  }

  try {
    await saveRewardAction.run(async () => {
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
        await api<{ reward: Reward }>(`${apiBase.value}/${editingReward.value.id}`, {
          method: 'PUT',
          body,
        })
      } else {
        await api<{ reward: Reward }>(apiBase.value, {
          method: 'POST',
          body,
        })
      }

      toast.success(editingReward.value ? 'Milestone updated.' : 'Milestone created.')
      closeForm()
      await loadRewards()
      emit('changed')
    })
  } catch {
    // AsyncActionButton shows failure.
  }
}

async function archiveReward(reward: Reward) {
  try {
    await api(`${apiBase.value}/${reward.id}/archive`, { method: 'PATCH' })
    toast.success('Milestone archived.')
    await loadRewards()
    emit('changed')
  } catch (exception) {
    toast.error(apiErrorMessage(exception, 'Could not archive milestone.'))
  }
}

async function reactivateReward(reward: Reward) {
  try {
    await api(`${apiBase.value}/${reward.id}/reactivate`, { method: 'PATCH' })
    toast.success('Milestone restored.')
    await loadRewards()
    emit('changed')
  } catch (exception) {
    toast.error(apiErrorMessage(exception, 'Could not restore milestone.'))
  }
}

onMounted(loadRewards)
</script>

<template>
  <AppCard>
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="text-xl font-black text-ink">Rewards</h2>
        <p class="mt-2 text-sm font-medium text-ink-muted">
          Create and edit milestone rewards for this brand.
        </p>
      </div>
      <AppButton v-if="!formOpen" variant="secondary" @click="openCreateForm">
        <Plus class="size-4" />
        Add milestone
      </AppButton>
    </div>

    <p v-if="error" class="mt-4 text-sm font-semibold text-danger">{{ error }}</p>
    <p v-else-if="loading" class="mt-4 text-sm font-medium text-ink-muted">Loading rewards…</p>

    <ul v-else-if="sortedRewards.length" class="mt-5 space-y-3">
      <li
        v-for="reward in sortedRewards"
        :key="reward.id"
        class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface-muted px-4 py-3"
      >
        <div class="flex min-w-0 items-center gap-3">
          <div class="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-surface">
            <img :src="rewardImageUrl(reward)" :alt="reward.title" class="size-full object-cover">
          </div>
          <div class="min-w-0">
            <p class="text-sm font-bold text-ink">{{ reward.title }}</p>
            <p class="text-xs font-medium text-ink-muted">
              {{ reward.required_stamps }} stamps
              <span v-if="!reward.active"> · archived</span>
            </p>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <AppButton variant="secondary" size="sm" @click="startEditing(reward)">Edit</AppButton>
          <AppButton
            v-if="reward.active"
            variant="secondary"
            size="sm"
            @click="archiveReward(reward)"
          >
            Archive
          </AppButton>
          <AppButton
            v-else
            variant="secondary"
            size="sm"
            @click="reactivateReward(reward)"
          >
            Restore
          </AppButton>
        </div>
      </li>
    </ul>

    <p v-else class="mt-5 text-sm font-medium text-ink-muted">No milestones yet.</p>

    <form
      v-if="formOpen"
      class="mt-6 grid gap-4 border-t border-border pt-6"
      @submit.prevent="saveReward"
    >
      <div class="flex items-center justify-between gap-3">
        <h3 class="text-sm font-black uppercase tracking-wide text-ink-soft">
          {{ editingReward ? 'Edit milestone' : 'New milestone' }}
        </h3>
        <AppButton type="button" variant="ghost" size="sm" @click="closeForm">Cancel</AppButton>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <div>
          <label class="text-sm font-bold text-ink-muted">Title</label>
          <input v-model="title" required class="mt-2 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-medium text-ink outline-none focus:border-ink-soft">
        </div>
        <div>
          <label class="text-sm font-bold text-ink-muted">Required stamps</label>
          <input v-model.number="requiredStamps" type="number" min="1" max="100" required class="mt-2 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-medium text-ink outline-none focus:border-ink-soft">
        </div>
        <div class="md:col-span-2">
          <label class="text-sm font-bold text-ink-muted">Description</label>
          <textarea v-model="description" rows="2" class="mt-2 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-ink outline-none focus:border-ink-soft" />
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-4">
        <img
          :src="imagePreviewUrl ?? rewardImageUrl(editingReward)"
          alt=""
          class="size-16 rounded-xl border border-border object-cover"
        >
        <div class="flex flex-wrap gap-2">
          <ImageCropUpload preset="square" modal-title="Crop reward image (1:1)" @crop="onRewardImageCrop">
            <AppButton type="button" variant="secondary" size="sm">Upload image</AppButton>
          </ImageCropUpload>
          <AppButton
            v-if="editingReward?.image && !removeImage"
            type="button"
            variant="ghost"
            size="sm"
            @click="removeImage = true"
          >
            <Trash2 class="size-4" />
            Remove image
          </AppButton>
        </div>
      </div>

      <AsyncActionButton
        type="submit"
        idle-label="Save milestone"
        loading-label="Saving…"
        success-label="Saved ✓"
        :loading="saveRewardAction.loading"
        :success="saveRewardAction.success"
        :error="saveRewardAction.error"
      />
    </form>
  </AppCard>
</template>
