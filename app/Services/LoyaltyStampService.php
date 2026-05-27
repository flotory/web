<?php

namespace App\Services;

use App\Events\StampAdded;
use App\Models\Customer;
use App\Models\Reward;
use App\Models\RewardRedemption;
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
            $previousStamps = $customer->stamps;
            $customer->increment('stamps', $stamps);
            $customer->refresh();

            $visit = $customer->visits()->create([
                'venue_id' => $customer->venue_id,
                'created_by' => $staff->id,
            ]);

            return [
                'customer' => $customer->load('user', 'venue'),
                'visit' => $visit,
                'previous_stamps' => $previousStamps,
                'added_stamps' => $stamps,
                'next_reward' => $this->nextRewardFor($customer),
                'available_rewards' => $this->availableRewardsFor($customer),
                'recent_visits' => $customer->visits()->latest()->limit(5)->get(),
            ];
        });

        StampAdded::dispatch(
            $result['customer'],
            $result['previous_stamps'],
            $result['added_stamps'],
            $result['next_reward'],
            $result['available_rewards'],
        );

        return $result;
    }

    public function redeemReward(Customer $customer, Reward $reward, User $redeemer): RewardRedemption
    {
        if ($reward->venue_id !== $customer->venue_id || ! $reward->active) {
            throw ValidationException::withMessages([
                'reward' => 'This reward is not available for the scanned customer.',
            ]);
        }

        return DB::transaction(function () use ($customer, $reward, $redeemer): RewardRedemption {
            $customer = Customer::query()->whereKey($customer->id)->lockForUpdate()->firstOrFail();

            if ($customer->stamps < $reward->required_stamps) {
                throw ValidationException::withMessages([
                    'reward' => 'The customer does not have enough stamps for this reward.',
                ]);
            }

            $customer->decrement('stamps', $reward->required_stamps);

            return RewardRedemption::create([
                'customer_id' => $customer->id,
                'reward_id' => $reward->id,
                'redeemed_by' => $redeemer->id,
                'redeemed_at' => now(),
            ]);
        });
    }

    public function nextRewardFor(Customer $customer): ?Reward
    {
        return Reward::query()
            ->where('venue_id', $customer->venue_id)
            ->where('active', true)
            ->where('required_stamps', '>', $customer->stamps)
            ->orderBy('required_stamps')
            ->first();
    }

    public function availableRewardsFor(Customer $customer): Collection
    {
        return Reward::query()
            ->where('venue_id', $customer->venue_id)
            ->where('active', true)
            ->where('required_stamps', '<=', $customer->stamps)
            ->orderBy('required_stamps')
            ->get();
    }

    private function guardAgainstDuplicateScan(Customer $customer): void
    {
        $recentVisitExists = $customer->visits()
            ->where('created_at', '>=', now()->sub(CarbonInterval::seconds(5)))
            ->exists();

        if ($recentVisitExists) {
            throw ValidationException::withMessages([
                'qr_token' => 'This loyalty card was stamped just now. Please wait a few seconds before adding more stars.',
            ]);
        }
    }
}
