<?php

namespace App\Services;

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

    public function addStamp(
        Customer $customer,
        User $actor,
        int $stamps = 1,
        ?StampAwardContext $context = null,
    ): array {
        $context ??= StampAwardContext::nfcTap();
        $customer->loadMissing('brand');
        $requestedStamps = max($stamps, 1);
        $campaignWarning = null;
        $multiplier = 1;
        $stampVenue = $this->resolveStampVenue($customer, $context);

        if ($context->appliesCampaignMultiplier()) {
            try {
                $multiplier = $this->campaigns->multiplierFor($customer, $stampVenue, null, $requestedStamps);
            } catch (Throwable $exception) {
                Log::warning('Campaign multiplier failed during stamp; awarding base stamp.', [
                    'customer_id' => $customer->id,
                    'brand_id' => $customer->brand_id,
                    'exception' => $exception->getMessage(),
                ]);
                $campaignWarning = 'Your stamp was added. Bonus stamps from the promotion could not be applied right now — any extra stamps will be added once we finish calculating the promotion.';
                $multiplier = 1;
            }
        }

        $stampsToAward = $requestedStamps * $multiplier;

        $result = DB::transaction(function () use ($customer, $actor, $stampsToAward, $requestedStamps, $multiplier, $context, $campaignWarning, $stampVenue): array {
            $customer = Customer::query()->whereKey($customer->id)->lockForUpdate()->firstOrFail();
            $customer->load('user', 'brand');
            $this->guardAgainstDuplicateScan($customer);
            $rewards = $this->milestonesForBrand($customer);
            $cycle = $this->activeCycle($customer);
            $previousStamps = $customer->stamps;
            $balance = $customer->stamps + $stampsToAward;
            $maxMilestone = (int) ($rewards->max('required_stamps') ?? 0);
            $completedCycle = false;

            if ($maxMilestone > 0) {
                while ($balance >= $maxMilestone) {
                    $this->unlockForCycle($customer, $rewards, $cycle->cycle_number, $maxMilestone);
                    $cycle->forceFill([
                        'completed_at' => now(),
                    ])->save();

                    $balance -= $maxMilestone;
                    $cycle = $this->startNextCycle($customer, $cycle->cycle_number + 1);
                    $completedCycle = true;
                }
            }

            $customer->forceFill([
                'stamps' => $balance,
                'lifetime_stamps' => (int) $customer->lifetime_stamps + $stampsToAward,
            ])->save();

            if ($balance > 0) {
                $this->unlockForCycle($customer, $rewards, $cycle->cycle_number, $balance);
            }

            $customer->refresh()->load('user', 'brand');

            $visit = $customer->visits()->create([
                'venue_id' => $stampVenue->id,
                'created_by' => $context->recordsStaffOnVisit() ? $actor->id : null,
            ]);

            $journey = $this->journeyFor($customer);

            return [
                'customer' => $customer,
                'visit' => $visit,
                'previous_stamps' => $previousStamps,
                'added_stamps' => $stampsToAward,
                'requested_stamps' => $requestedStamps,
                'stamp_multiplier' => $multiplier,
                'active_campaign' => $this->resolveActiveCampaignForStamp($customer, $multiplier, $campaignWarning),
                'campaign_warning' => $campaignWarning,
                'next_reward' => $this->nextRewardFor($customer),
                'available_rewards' => $this->availableRewardsFor($customer),
                'milestones' => $journey['milestones'],
                'current_cycle' => $journey['current_cycle'],
                'cycle_completed' => $completedCycle,
                'recent_visits' => $customer->visits()->latest()->limit(5)->get(),
                'source' => $context->source,
            ];
        });

        AuditLog::loyalty(
            'stamp.added',
            $result['customer'],
            $actor,
            'success',
            [
                'status' => 'success',
                'visit_id' => $result['visit']->id,
                'added_stamps' => $result['added_stamps'],
                'cycle_completed' => $result['cycle_completed'],
                'source' => $result['source'],
            ],
        );

        return $result;
    }

    public function redeemUnlock(RewardUnlock $unlock, User $redeemer): RewardUnlock
    {
        $unlock->loadMissing('customer', 'reward');
        $customer = $unlock->customer;
        $reward = $unlock->reward;

        if ($reward->brand_id !== $customer->brand_id) {
            throw ValidationException::withMessages([
                'reward' => 'This reward is not available.',
            ]);
        }

        if (! $reward->active && ! $this->hasPendingUnlock($customer, $reward)) {
            throw ValidationException::withMessages([
                'reward' => 'This reward is not available.',
            ]);
        }

        $unlock = DB::transaction(function () use ($unlock, $redeemer, $reward): RewardUnlock {
            $locked = RewardUnlock::query()
                ->whereKey($unlock->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($locked->claimed_at) {
                throw ValidationException::withMessages([
                    'unlock' => 'This reward was already redeemed.',
                ]);
            }

            $locked->forceFill([
                'claimed_at' => now(),
                'claimed_by' => $redeemer->id,
            ])->save();

            $locked = $locked->fresh(['reward']);

            AuditLog::loyalty(
                'reward.redeemed',
                $locked,
                $redeemer,
                'success',
                [
                    'status' => 'success',
                    'reward_id' => $reward->id,
                    'reward_title' => $reward->title,
                ],
            );

            return $locked;
        });

        return $unlock;
    }

    /**
     * @return array<string, mixed>
     */
    public function redeemApiPayload(Customer $customer, RewardUnlock $unlock): array
    {
        $customer = $customer->fresh()->load('brand', 'user');

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
        return $this->milestonesForBrand($customer)
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
     *     next_reward_image: string|null,
     *     next_reward_image_thumb: string|null,
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
            'next_reward_image' => $next?->image,
            'next_reward_image_thumb' => $next?->image_thumb,
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

    /** Manual repair helper — not called from customer API reads. Use only for data fixes. */
    public function syncEligibleUnlocks(Customer $customer): void
    {
        $customer = $customer->fresh() ?? $customer;
        $cycle = $this->activeCycle($customer);
        $rewards = $this->milestonesForBrand($customer);
        $this->unlockForCycle($customer, $rewards, $cycle->cycle_number, $customer->stamps);
    }

    public function journeyFor(Customer $customer): array
    {
        $customer = $customer->fresh();
        $cycle = $this->activeCycle($customer);
        $milestones = $this->milestonesForBrand($customer);
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

    private function hasPendingUnlock(Customer $customer, Reward $reward): bool
    {
        return RewardUnlock::query()
            ->where('customer_id', $customer->id)
            ->where('reward_id', $reward->id)
            ->whereNull('claimed_at')
            ->exists();
    }

    private function milestonesForBrand(Customer $customer): Collection
    {
        return Reward::query()
            ->where('brand_id', $customer->brand_id)
            ->where('active', true)
            ->orderBy('required_stamps')
            ->get();
    }

    private function resolveStampVenue(Customer $customer, StampAwardContext $context): \App\Models\Venue
    {
        if ($context->venueId !== null) {
            return \App\Models\Venue::query()->findOrFail($context->venueId);
        }

        $customer->loadMissing('brand');

        return $customer->brand->venues()->where('is_primary', true)->first()
            ?? $customer->brand->venues()->firstOrFail();
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

    private function resolveActiveCampaignForStamp(Customer $customer, int $multiplier, ?string $campaignWarning): ?array
    {
        if ($campaignWarning !== null || $multiplier <= 1) {
            return null;
        }

        try {
            return $this->campaigns->promotionForCustomer($customer);
        } catch (Throwable $exception) {
            Log::warning('Campaign promotion payload failed after stamp.', [
                'customer_id' => $customer->id,
                'brand_id' => $customer->brand_id,
                'exception' => $exception->getMessage(),
            ]);

            return null;
        }
    }

    private function guardAgainstDuplicateScan(Customer $customer): void
    {
        $cooldownSeconds = max((int) config('loyalty.stamp_cooldown_seconds', 3), 1);

        $recentVisitExists = $customer->visits()
            ->where('created_at', '>=', now()->sub(CarbonInterval::seconds($cooldownSeconds)))
            ->exists();

        if ($recentVisitExists) {
            throw ValidationException::withMessages([
                'stamp' => 'This loyalty card was stamped just now. Please wait a few seconds before adding more stamps.',
            ]);
        }
    }
}
