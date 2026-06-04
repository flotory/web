<?php

namespace App\Services;

use App\Events\RewardRedeemed;
use App\Events\StampAdded;
use App\Models\CustomerRewardCycle;
use App\Models\Customer;
use App\Models\Reward;
use App\Models\RewardUnlock;
use App\Models\User;
use App\Support\AuditLog;
use Carbon\CarbonInterval;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Throwable;

class LoyaltyStampService
{
    public function __construct(private CampaignService $campaigns) {}

    public function addStamp(Customer $customer, User $staff, int $stamps = 1): array
    {
        $customer->loadMissing('venue');
        $requestedStamps = max($stamps, 1);
        $multiplier = $this->campaigns->multiplierFor($customer, $customer->venue);
        $stampsToAward = $requestedStamps * $multiplier;

        $result = DB::transaction(function () use ($customer, $staff, $stampsToAward, $requestedStamps, $multiplier): array {
            $customer = Customer::query()->whereKey($customer->id)->lockForUpdate()->firstOrFail();
            $customer->load('user', 'venue');
            $this->guardAgainstDuplicateScan($customer);
            $rewards = $this->milestonesForVenue($customer);
            $cycle = $this->activeCycle($customer);
            $previousStamps = $customer->stamps;
            $newStamps = $customer->stamps + $stampsToAward;

            $maxMilestone = (int) ($rewards->max('required_stamps') ?? 0);
            $completedCycle = false;

            if ($maxMilestone > 0 && $newStamps >= $maxMilestone) {
                $this->unlockForCycle($customer, $rewards, $cycle->cycle_number, $maxMilestone);
                $cycle->forceFill([
                    'completed_at' => now(),
                ])->save();

                $customer->forceFill(['stamps' => 0])->save();
                $cycle = $this->startNextCycle($customer, $cycle->cycle_number + 1);
                $completedCycle = true;
            } else {
                $customer->forceFill(['stamps' => $newStamps])->save();
                $this->unlockForCycle($customer, $rewards, $cycle->cycle_number, $newStamps);
            }

            $customer->refresh()->load('user', 'venue');

            $visit = $customer->visits()->create([
                'venue_id' => $customer->venue_id,
                'created_by' => $staff->id,
            ]);

            $journey = $this->journeyFor($customer);

            return [
                'customer' => $customer,
                'visit' => $visit,
                'previous_stamps' => $previousStamps,
                'added_stamps' => $stampsToAward,
                'requested_stamps' => $requestedStamps,
                'stamp_multiplier' => $multiplier,
                'active_campaign' => $this->campaigns->scannerContextFor($customer),
                'next_reward' => $this->nextRewardFor($customer),
                'available_rewards' => $this->availableRewardsFor($customer),
                'milestones' => $journey['milestones'],
                'current_cycle' => $journey['current_cycle'],
                'cycle_completed' => $completedCycle,
                'recent_visits' => $customer->visits()->latest()->limit(5)->get(),
            ];
        });

        try {
            StampAdded::dispatch(
                $result['customer'],
                $result['previous_stamps'],
                $result['added_stamps'],
                $result['next_reward'],
                $result['available_rewards'],
                $result['milestones'],
                $result['current_cycle'],
                $result['cycle_completed'],
            );
        } catch (Throwable $exception) {
            Log::warning('Stamp added but realtime broadcast failed.', [
                'customer_id' => $result['customer']->id,
                'exception' => $exception->getMessage(),
            ]);
        }

        AuditLog::loyalty(
            'stamp.added',
            $result['customer'],
            $staff,
            'success',
            [
                'status' => 'success',
                'visit_id' => $result['visit']->id,
                'added_stamps' => $result['added_stamps'],
                'cycle_completed' => $result['cycle_completed'],
            ],
        );

        return $result;
    }

    public function redeemReward(
        Customer $customer,
        Reward $reward,
        User $redeemer,
        ?string $claimSessionToken = null,
    ): RewardUnlock {
        if ($reward->venue_id !== $customer->venue_id || ! $reward->active) {
            throw ValidationException::withMessages([
                'reward' => 'This reward is not available for the scanned customer.',
            ]);
        }

        $unlock = DB::transaction(function () use ($customer, $reward, $redeemer): RewardUnlock {
            $customer = Customer::query()->whereKey($customer->id)->lockForUpdate()->firstOrFail();
            $unlock = RewardUnlock::query()
                ->where('customer_id', $customer->id)
                ->where('reward_id', $reward->id)
                ->whereNull('claimed_at')
                ->orderBy('cycle_number')
                ->lockForUpdate()
                ->first();

            if (! $unlock) {
                throw ValidationException::withMessages([
                    'reward' => 'This milestone is not unlocked yet.',
                ]);
            }

            $unlock->forceFill([
                'claimed_at' => now(),
                'claimed_by' => $redeemer->id,
            ])->save();

            $unlock = $unlock->fresh(['reward']);

            AuditLog::loyalty(
                'reward.redeemed',
                $unlock,
                $redeemer,
                'success',
                [
                    'status' => 'success',
                    'reward_id' => $reward->id,
                    'reward_title' => $reward->title,
                ],
            );

            return $unlock;
        });

        try {
            RewardRedeemed::dispatch(
                $customer->fresh()->load('venue', 'user'),
                $unlock,
                $claimSessionToken,
            );
        } catch (Throwable $exception) {
            Log::warning('Reward redeemed but realtime broadcast failed.', [
                'customer_id' => $customer->id,
                'unlock_id' => $unlock->id,
                'exception' => $exception->getMessage(),
            ]);
        }

        return $unlock;
    }

    /**
     * @return array<string, mixed>
     */
    public function redeemApiPayload(Customer $customer, RewardUnlock $unlock): array
    {
        $customer = $customer->fresh()->load('venue', 'user');

        return [
            'unlock' => $unlock,
            'customer' => $customer,
            'next_reward' => $this->nextRewardFor($customer),
            'available_rewards' => $this->availableRewardsFor($customer),
            'journey' => $this->journeyFor($customer),
            'recent_visits' => $customer->visits()->latest()->limit(10)->get(),
        ];
    }

    public function nextRewardFor(Customer $customer): ?Reward
    {
        return $this->milestonesForVenue($customer)
            ->where('venue_id', $customer->venue_id)
            ->where('required_stamps', '>', $customer->stamps)
            ->first();
    }

    public function availableRewardsFor(Customer $customer): Collection
    {
        $rewardIds = RewardUnlock::query()
            ->where('customer_id', $customer->id)
            ->whereNull('claimed_at')
            ->pluck('reward_id')
            ->unique()
            ->values();

        if ($rewardIds->isEmpty()) {
            return new Collection();
        }

        return Reward::query()
            ->whereIn('id', $rewardIds)
            ->orderBy('required_stamps')
            ->get();
    }

    public function pendingRewardCountFor(Customer $customer): int
    {
        return RewardUnlock::query()
            ->where('customer_id', $customer->id)
            ->whereNull('claimed_at')
            ->count();
    }

    /**
     * @return array{
     *     stamps: int,
     *     max_stamps: int,
     *     pending_rewards_count: int,
     *     next_reward_title: string|null,
     *     next_reward_stamps: int|null,
     *     stamps_to_next: int|null
     * }
     */
    public function cardListSummary(Customer $customer): array
    {
        $customer = $customer->fresh() ?? $customer;
        $journey = $this->journeyFor($customer);
        $milestones = collect($journey['milestones']);
        $maxStamps = (int) ($milestones->max('required_stamps') ?? 0);
        $maxStamps = $maxStamps > 0 ? $maxStamps : 10;
        $next = $this->nextRewardFor($customer);
        $stampsToNext = $next ? max($next->required_stamps - $customer->stamps, 0) : null;

        return [
            'stamps' => $customer->stamps,
            'max_stamps' => $maxStamps,
            'pending_rewards_count' => $this->pendingRewardCountFor($customer),
            'next_reward_title' => $next?->title,
            'next_reward_stamps' => $next?->required_stamps,
            'stamps_to_next' => $stampsToNext,
        ];
    }

    /**
     * @return Collection<int, RewardUnlock>
     */
    public function pendingUnlocksFor(Customer $customer): Collection
    {
        return RewardUnlock::query()
            ->where('customer_id', $customer->id)
            ->whereNull('claimed_at')
            ->with('reward')
            ->orderBy('cycle_number')
            ->orderBy('unlocked_at')
            ->get();
    }

    /** Ensures RewardUnlock rows exist for every milestone the customer has already earned. */
    public function syncEligibleUnlocks(Customer $customer): void
    {
        $customer = $customer->fresh() ?? $customer;
        $cycle = $this->activeCycle($customer);
        $rewards = $this->milestonesForVenue($customer);
        $this->unlockForCycle($customer, $rewards, $cycle->cycle_number, $customer->stamps);
    }

    public function journeyFor(Customer $customer): array
    {
        $customer = $customer->fresh();
        $cycle = $this->activeCycle($customer);
        $milestones = $this->milestonesForVenue($customer);
        $unlocks = RewardUnlock::query()
            ->where('customer_id', $customer->id)
            ->where('cycle_number', $cycle->cycle_number)
            ->get()
            ->keyBy('reward_id');

        return [
            'current_cycle' => $cycle->cycle_number,
            'current_stamps' => $customer->stamps,
            'next_milestone' => $this->nextRewardFor($customer),
            'milestones' => $milestones->map(function (Reward $reward) use ($unlocks): array {
                $unlock = $unlocks->get($reward->id);

                return [
                    'id' => $reward->id,
                    'title' => $reward->title,
                    'description' => $reward->description,
                    'image' => $reward->image,
                    'image_thumb' => $reward->image_thumb,
                    'required_stamps' => $reward->required_stamps,
                    'active' => $reward->active,
                    'unlocked' => (bool) $unlock,
                    'claimed' => (bool) $unlock?->claimed_at,
                    'claimed_at' => $unlock?->claimed_at,
                ];
            })->values(),
        ];
    }

    private function milestonesForVenue(Customer $customer): Collection
    {
        return Reward::query()
            ->where('venue_id', $customer->venue_id)
            ->where('active', true)
            ->orderBy('required_stamps')
            ->get();
    }

    private function activeCycle(Customer $customer): CustomerRewardCycle
    {
        $existing = CustomerRewardCycle::query()
            ->where('customer_id', $customer->id)
            ->whereNull('completed_at')
            ->latest('cycle_number')
            ->first();

        if ($existing) {
            return $existing;
        }

        $nextNumber = (int) CustomerRewardCycle::query()
            ->where('customer_id', $customer->id)
            ->max('cycle_number') + 1;

        return $this->startNextCycle($customer, max($nextNumber, 1));
    }

    private function startNextCycle(Customer $customer, int $cycleNumber): CustomerRewardCycle
    {
        return CustomerRewardCycle::query()->create([
            'customer_id' => $customer->id,
            'cycle_number' => $cycleNumber,
        ]);
    }

    private function unlockForCycle(Customer $customer, Collection $rewards, int $cycleNumber, int $stamps): void
    {
        $eligible = $rewards->where('required_stamps', '<=', $stamps);

        foreach ($eligible as $reward) {
            $existing = RewardUnlock::query()
                ->where('customer_id', $customer->id)
                ->where('reward_id', $reward->id)
                ->where('cycle_number', $cycleNumber)
                ->first();

            if ($existing?->claimed_at !== null) {
                continue;
            }

            RewardUnlock::query()->firstOrCreate([
                'customer_id' => $customer->id,
                'reward_id' => $reward->id,
                'cycle_number' => $cycleNumber,
            ], [
                'unlocked_at' => now(),
            ]);
        }
    }

    private function guardAgainstDuplicateScan(Customer $customer): void
    {
        $recentVisitExists = $customer->visits()
            ->where('created_at', '>=', now()->sub(CarbonInterval::seconds(5)))
            ->exists();

        if ($recentVisitExists) {
            throw ValidationException::withMessages([
                'qr_token' => 'This loyalty card was stamped just now. Please wait a few seconds before adding more stamps.',
            ]);
        }
    }
}
