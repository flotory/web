<?php

namespace App\Services;

use App\Events\StampAdded;
use App\Models\CustomerRewardCycle;
use App\Models\Customer;
use App\Models\Reward;
use App\Models\RewardUnlock;
use App\Models\User;
use Carbon\CarbonInterval;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class LoyaltyStampService
{
    public function addStamp(Customer $customer, User $staff, int $stamps = 1): array
    {
        $this->guardAgainstDuplicateScan($customer);

        $result = DB::transaction(function () use ($customer, $staff, $stamps): array {
            $customer = Customer::query()->whereKey($customer->id)->lockForUpdate()->firstOrFail();
            $rewards = $this->milestonesForVenue($customer);
            $cycle = $this->activeCycle($customer);
            $previousStamps = $customer->stamps;
            $newStamps = $customer->stamps + max($stamps, 1);

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
                'added_stamps' => $stamps,
                'next_reward' => $this->nextRewardFor($customer),
                'available_rewards' => $this->availableRewardsFor($customer),
                'milestones' => $journey['milestones'],
                'current_cycle' => $journey['current_cycle'],
                'cycle_completed' => $completedCycle,
                'recent_visits' => $customer->visits()->latest()->limit(5)->get(),
            ];
        });

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

        return $result;
    }

    public function redeemReward(Customer $customer, Reward $reward, User $redeemer): RewardUnlock
    {
        if ($reward->venue_id !== $customer->venue_id || ! $reward->active) {
            throw ValidationException::withMessages([
                'reward' => 'This reward is not available for the scanned customer.',
            ]);
        }

        return DB::transaction(function () use ($customer, $reward, $redeemer): RewardUnlock {
            $customer = Customer::query()->whereKey($customer->id)->lockForUpdate()->firstOrFail();
            $cycle = $this->activeCycle($customer);
            $unlock = RewardUnlock::query()
                ->where('customer_id', $customer->id)
                ->where('reward_id', $reward->id)
                ->where('cycle_number', $cycle->cycle_number)
                ->lockForUpdate()
                ->first();

            if (! $unlock) {
                throw ValidationException::withMessages([
                    'reward' => 'This milestone is not unlocked yet.',
                ]);
            }

            if ($unlock->claimed_at) {
                throw ValidationException::withMessages([
                    'reward' => 'This milestone reward was already claimed this cycle.',
                ]);
            }

            $unlock->forceFill([
                'claimed_at' => now(),
                'claimed_by' => $redeemer->id,
            ])->save();

            return $unlock->fresh(['reward']);
        });
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
        $cycle = $this->activeCycle($customer);

        $rewardIds = RewardUnlock::query()
            ->where('customer_id', $customer->id)
            ->where('cycle_number', $cycle->cycle_number)
            ->whereNull('claimed_at')
            ->pluck('reward_id');

        if ($rewardIds->isEmpty()) {
            return new Collection();
        }

        return Reward::query()
            ->whereIn('id', $rewardIds)
            ->orderBy('required_stamps')
            ->get();
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
