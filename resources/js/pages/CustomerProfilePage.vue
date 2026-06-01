<script setup lang="ts">
import { ArrowLeft } from '@lucide/vue'
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import AppShell from '@/layouts/AppShell.vue'
import { api, apiErrorMessage } from '@/lib/api'
import { activityLabel, activityTone, formatRelativeDays, formatShortDate } from '@/lib/formatDate'
import { toast } from '@/lib/toast'
import { useWorkspaceStore } from '@/stores/workspace'
import type { CustomerProfileResponse } from '@/types'

const route = useRoute()
const workspace = useWorkspaceStore()

const profile = ref<CustomerProfileResponse | null>(null)
const loading = ref(true)
const error = ref('')
const savingBirthday = ref(false)
const savingNote = ref(false)
const birthday = ref('')
const noteBody = ref('')

const customerId = computed(() => Number(route.params.customerId))

const timelineIcon = (type: string) => {
  switch (type) {
    case 'visit':
      return '◎'
    case 'milestone_unlocked':
      return '★'
    case 'redemption':
      return '✓'
    case 'cycle_completed':
      return '↻'
    default:
      return '◍'
  }
}

async function loadProfile() {
  loading.value = true
  error.value = ''

  try {
    await workspace.bootstrap()
    const venueId = workspace.effectiveVenueId
    if (!venueId) {
      profile.value = null
      return
    }

    profile.value = await api<CustomerProfileResponse>(
      `/venues/${venueId}/customers/${customerId.value}`,
    )
    birthday.value = profile.value.customer.user?.birthday ?? ''
  } catch (exception) {
    error.value = apiErrorMessage(exception, 'Could not load customer profile.')
  } finally {
    loading.value = false
  }
}

async function saveBirthday() {
  const venueId = workspace.effectiveVenueId
  if (!venueId || !profile.value) {
    return
  }

  savingBirthday.value = true
  try {
    profile.value = await api<CustomerProfileResponse>(
      `/venues/${venueId}/customers/${customerId.value}`,
      {
        method: 'PATCH',
        body: { birthday: birthday.value || null },
      },
    )
    toast.success('Birthday updated')
  } catch (exception) {
    toast.error(apiErrorMessage(exception, 'Could not update birthday.'))
  } finally {
    savingBirthday.value = false
  }
}

async function addNote() {
  const venueId = workspace.effectiveVenueId
  if (!venueId || !noteBody.value.trim()) {
    return
  }

  savingNote.value = true
  try {
    profile.value = await api<CustomerProfileResponse>(
      `/venues/${venueId}/customers/${customerId.value}/notes`,
      {
        method: 'POST',
        body: { body: noteBody.value.trim() },
      },
    )
    noteBody.value = ''
    toast.success('Note added')
  } catch (exception) {
    toast.error(apiErrorMessage(exception, 'Could not add note.'))
  } finally {
    savingNote.value = false
  }
}

watch(() => [workspace.filterVenueId, customerId.value], loadProfile)

onMounted(loadProfile)
</script>

<template>
  <AppShell>
    <RouterLink
      to="/customers"
      class="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
    >
      <ArrowLeft class="size-4" :stroke-width="2.2" />
      Back to customers
    </RouterLink>

    <div v-if="loading" class="mt-6">
      <EmptyState title="Loading customer profile…" />
    </div>

    <ErrorState v-else-if="error" class="mt-6" :message="error" @retry="loadProfile" />

    <template v-else-if="profile">
      <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <AppBadge :tone="activityTone(profile.stats.activity_status)">
            {{ activityLabel(profile.stats.activity_status) }}
          </AppBadge>
          <h1 class="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            {{ profile.customer.user?.name ?? 'Customer' }}
          </h1>
          <p class="mt-1 text-slate-500">{{ profile.customer.user?.email }}</p>
        </div>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <AppCard wrapper-class="p-3 text-center min-w-[5.5rem]">
            <p class="text-xl font-black text-slate-950">{{ profile.stats.visits_count }}</p>
            <p class="text-[11px] font-semibold uppercase text-slate-400">Visits</p>
          </AppCard>
          <AppCard wrapper-class="p-3 text-center min-w-[5.5rem]">
            <p class="text-xl font-black text-slate-950">{{ profile.stats.rewards_claimed_count }}</p>
            <p class="text-[11px] font-semibold uppercase text-slate-400">Redeemed</p>
          </AppCard>
          <AppCard wrapper-class="p-3 text-center min-w-[5.5rem]">
            <p class="text-xl font-black text-amber-700">{{ profile.stats.stamps }}</p>
            <p class="text-[11px] font-semibold uppercase text-slate-400">Stamps</p>
          </AppCard>
          <AppCard wrapper-class="p-3 text-center min-w-[5.5rem]">
            <p class="text-sm font-bold text-slate-800">{{ formatRelativeDays(profile.stats.last_visit_at) }}</p>
            <p class="text-[11px] font-semibold uppercase text-slate-400">Last visit</p>
          </AppCard>
        </div>
      </div>

      <div class="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div class="space-y-6">
          <AppCard>
            <h2 class="text-lg font-black text-slate-950">Activity timeline</h2>
            <p class="mt-1 text-sm text-slate-500">
              Joined {{ formatShortDate(profile.stats.joined_at) }} ·
              {{ profile.stats.rewards_unlocked_count }} unlocks ·
              {{ profile.stats.rewards_claimed_count }} redemptions
            </p>
            <ol v-if="profile.timeline.length" class="mt-5 space-y-4 border-l-2 border-slate-100 pl-5">
              <li
                v-for="(event, index) in profile.timeline"
                :key="`${event.type}-${event.occurred_at}-${index}`"
                class="relative"
              >
                <span
                  class="absolute -left-[1.65rem] top-0.5 grid size-6 place-items-center rounded-full bg-white text-xs ring-2 ring-slate-100"
                  aria-hidden="true"
                >
                  {{ timelineIcon(event.type) }}
                </span>
                <p class="font-semibold text-slate-900">{{ event.title }}</p>
                <p class="text-xs text-slate-400">
                  {{ formatShortDate(event.occurred_at) }}
                  <span v-if="event.detail"> · {{ event.detail }}</span>
                </p>
              </li>
            </ol>
            <p v-else class="mt-4 text-sm text-slate-500">No activity yet.</p>
          </AppCard>

          <AppCard>
            <h2 class="text-lg font-black text-slate-950">Visit history</h2>
            <ul v-if="profile.visits.length" class="mt-4 divide-y divide-slate-100">
              <li
                v-for="visit in profile.visits"
                :key="visit.id"
                class="flex items-center justify-between gap-3 py-3 text-sm"
              >
                <span class="font-semibold text-slate-800">{{ formatShortDate(visit.created_at) }}</span>
                <span class="text-slate-500">{{ visit.staff_name ? `Stamp by ${visit.staff_name}` : 'Stamp recorded' }}</span>
              </li>
            </ul>
            <p v-else class="mt-4 text-sm text-slate-500">No visits recorded yet.</p>
          </AppCard>

          <AppCard>
            <h2 class="text-lg font-black text-slate-950">Reward history</h2>
            <ul v-if="profile.reward_history.length" class="mt-4 divide-y divide-slate-100">
              <li
                v-for="reward in profile.reward_history"
                :key="reward.id"
                class="py-3 text-sm"
              >
                <p class="font-semibold text-slate-900">{{ reward.title }}</p>
                <p class="text-slate-500">
                  Unlocked {{ formatShortDate(reward.unlocked_at) }}
                  <span v-if="reward.claimed_at">
                    · Redeemed {{ formatShortDate(reward.claimed_at) }}
                  </span>
                </p>
              </li>
            </ul>
            <p v-else class="mt-4 text-sm text-slate-500">No rewards unlocked yet.</p>
          </AppCard>
        </div>

        <div class="space-y-6">
          <AppCard>
            <h2 class="text-lg font-black text-slate-950">Birthday</h2>
            <p class="mt-1 text-sm text-slate-500">For future birthday campaigns.</p>
            <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <label class="flex-1 text-sm font-semibold text-slate-700">
                Date
                <input
                  v-model="birthday"
                  type="date"
                  class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-900 shadow-sm"
                >
              </label>
              <AppButton :disabled="savingBirthday" @click="saveBirthday">
                {{ savingBirthday ? 'Saving…' : 'Save' }}
              </AppButton>
            </div>
          </AppCard>

          <AppCard>
            <h2 class="text-lg font-black text-slate-950">Notes</h2>
            <p class="mt-1 text-sm text-slate-500">Private to your venue team.</p>
            <textarea
              v-model="noteBody"
              rows="3"
              class="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 shadow-sm"
              placeholder="e.g. Prefers oat milk, visits on weekends…"
            />
            <AppButton class="mt-3" :disabled="savingNote || !noteBody.trim()" @click="addNote">
              {{ savingNote ? 'Adding…' : 'Add note' }}
            </AppButton>
            <ul v-if="profile.notes.length" class="mt-5 space-y-3 border-t border-slate-100 pt-4">
              <li
                v-for="note in profile.notes"
                :key="note.id"
                class="rounded-xl bg-slate-50 px-3 py-3 text-sm"
              >
                <p class="text-slate-800">{{ note.body }}</p>
                <p class="mt-2 text-xs text-slate-400">
                  {{ note.author_name ?? 'Team' }} · {{ formatShortDate(note.created_at) }}
                </p>
              </li>
            </ul>
          </AppCard>
        </div>
      </div>
    </template>
  </AppShell>
</template>
