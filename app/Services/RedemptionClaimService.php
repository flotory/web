<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\RedemptionRequest;
use App\Models\RewardUnlock;
use App\Models\User;
use App\Models\Venue;
use App\Support\AuditLog;
use App\Support\LoyaltyQr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class RedemptionClaimService
{
    public function __construct(
        private readonly LoyaltyStampService $loyalty,
    ) {}

    public function createClaimSession(RewardUnlock $unlock): RedemptionRequest
    {
        if ($unlock->claimed_at !== null) {
            throw ValidationException::withMessages([
                'unlock' => 'This reward has already been redeemed.',
            ]);
        }

        $unlock->loadMissing('reward', 'customer.user', 'customer.venue');

        if (! $unlock->reward?->active) {
            throw ValidationException::withMessages([
                'unlock' => 'This reward is no longer available.',
            ]);
        }

        return DB::transaction(function () use ($unlock): RedemptionRequest {
            RedemptionRequest::query()
                ->where('reward_unlock_id', $unlock->id)
                ->whereNull('claimed_at')
                ->where('expires_at', '>', now())
                ->delete();

            $request = RedemptionRequest::query()->create([
                'reward_unlock_id' => $unlock->id,
                'token' => (string) Str::uuid(),
                'expires_at' => now()->addMinutes(10),
            ]);

            AuditLog::loyalty(
                'claim.session_created',
                $request,
                $unlock->customer->user,
                'success',
                [
                    'status' => 'success',
                    'reward_id' => $unlock->reward_id,
                    'unlock_id' => $unlock->id,
                ],
            );

            return $request;
        });
    }

    /**
     * @return array<string, mixed>
     */
    public function claimSessionPayload(RedemptionRequest $request, ?string $origin = null): array
    {
        $request->loadMissing('rewardUnlock.reward', 'rewardUnlock.customer.user', 'rewardUnlock.customer.venue');
        $unlock = $request->rewardUnlock;
        $customer = $unlock->customer;
        $reward = $unlock->reward;

        return [
            'token' => $request->token,
            'expires_at' => $request->expires_at,
            'claimed_at' => $request->claimed_at,
            'status' => $this->sessionStatus($request),
            'qr_value' => LoyaltyQr::redeemQrPayload($request->token),
            'unlock_id' => $unlock->id,
            'reward' => $reward,
            'customer' => $customer,
            'venue' => $customer->venue,
        ];
    }

    public function sessionStatus(RedemptionRequest $request): string
    {
        if ($request->isClaimed()) {
            return 'claimed';
        }

        if ($request->isExpired()) {
            return 'expired';
        }

        return 'pending';
    }

    /**
     * @return array<string, mixed>
     */
    public function redeemByToken(string $token, Venue $venue, User $staff): array
    {
        return DB::transaction(function () use ($token, $venue, $staff): array {
            $request = RedemptionRequest::query()
                ->where('token', $token)
                ->lockForUpdate()
                ->first();

            if (! $request) {
                throw ValidationException::withMessages([
                    'redemption_token' => 'This redemption code is not valid. Ask the customer to tap Claim in Rewards.',
                ]);
            }

            if ($request->isClaimed()) {
                throw ValidationException::withMessages([
                    'redemption_token' => 'This reward was already redeemed.',
                ]);
            }

            if ($request->isExpired()) {
                throw ValidationException::withMessages([
                    'redemption_token' => 'This redemption code expired. Ask the customer to tap Claim again.',
                ]);
            }

            $request->loadMissing('rewardUnlock.reward', 'rewardUnlock.customer.user', 'rewardUnlock.customer.venue');
            $unlock = $request->rewardUnlock;
            $customer = $unlock->customer;
            $reward = $unlock->reward;

            if ($customer->venue_id !== $venue->id) {
                throw ValidationException::withMessages([
                    'redemption_token' => "This code is for another venue. Switch to {$customer->venue?->name} or ask the customer to open the correct reward.",
                ]);
            }

            if ($unlock->claimed_at !== null) {
                $request->forceFill([
                    'claimed_at' => $unlock->claimed_at,
                    'claimed_by' => $unlock->claimed_by,
                ])->save();

                throw ValidationException::withMessages([
                    'redemption_token' => 'This reward was already redeemed.',
                ]);
            }

            $claimedUnlock = $this->loyalty->redeemReward($customer, $reward, $staff, $request->token);

            $request->forceFill([
                'claimed_at' => now(),
                'claimed_by' => $staff->id,
            ])->save();

            $customer = $customer->fresh()->load('user', 'venue');

            AuditLog::loyalty(
                'claim.redeemed',
                $request,
                $staff,
                'success',
                [
                    'status' => 'success',
                    'reward_id' => $reward->id,
                    'unlock_id' => $unlock->id,
                ],
            );

            return [
                'scan_type' => 'redeem',
                'redemption_request' => $request->fresh(),
                'unlock' => $claimedUnlock,
                'reward' => $claimedUnlock->reward,
                'customer' => $customer,
                'next_reward' => $this->loyalty->nextRewardFor($customer),
                'available_rewards' => $this->loyalty->availableRewardsFor($customer),
            ];
        });
    }

    /**
     * @return array{count: int, message: string, rewards: array<int, array{id: int, title: string}>}|null
     */
    public function pendingClaimWarningFor(Customer $customer): ?array
    {
        $count = $this->loyalty->pendingRewardCountFor($customer);

        if ($count === 0) {
            return null;
        }

        $titles = $this->loyalty->pendingUnlocksFor($customer)
            ->take(3)
            ->map(fn (RewardUnlock $unlock): array => [
                'id' => $unlock->reward_id,
                'title' => $unlock->reward->title,
            ])
            ->values()
            ->all();

        $name = $customer->user?->name ?? 'This customer';
        $message = $count === 1
            ? "{$name} has 1 reward ready to claim. Ask them to open Rewards → Claim, not the stamp card."
            : "{$name} has {$count} rewards ready to claim. Ask them to open Rewards → Claim, not the stamp card.";

        return [
            'count' => $count,
            'message' => $message,
            'rewards' => $titles,
        ];
    }
}
