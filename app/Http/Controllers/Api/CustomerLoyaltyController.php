<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\RedemptionRequest;
use App\Models\RewardUnlock;
use App\Models\Venue;
use App\Models\Reward;
use App\Services\CampaignService;
use App\Services\LoyaltyStampService;
use App\Services\RedemptionClaimService;
use App\Services\UniversalCustomerQrService;
use App\Support\AuditLog;
use App\Support\CustomerAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CustomerLoyaltyController extends Controller
{
    public function stampQr(Request $request, UniversalCustomerQrService $universalQr): JsonResponse
    {
        if (! $universalQr->isEnabled()) {
            return response()->json([
                'message' => 'Universal customer QR is not enabled.',
            ], 404);
        }

        return response()->json($universalQr->ensureForUser($request->user()));
    }

    public function mine(Request $request, LoyaltyStampService $loyalty, CampaignService $campaigns): JsonResponse
    {
        $cards = Customer::query()
            ->where('user_id', $request->user()->id)
            ->with([
                'venue',
                'visits' => fn ($query) => $query->latest()->limit(2),
            ])
            ->orderBy('venue_id')
            ->get();

        $activeCard = $request->integer('venue_id')
            ? $cards->firstWhere('venue_id', $request->integer('venue_id'))
            : $cards->first();

        if ($activeCard) {
            $loyalty->syncEligibleUnlocks($activeCard);
        }

        $isList = ! $request->integer('venue_id');

        $claimedHistory = $isList
            ? RewardUnlock::query()
                ->whereIn('customer_id', $cards->pluck('id'))
                ->whereNotNull('claimed_at')
                ->with('reward:id,title')
                ->orderByDesc('claimed_at')
                ->limit(12)
                ->get()
                ->map(fn (RewardUnlock $unlock): array => [
                    'id' => "{$unlock->customer_id}-{$unlock->reward_id}-{$unlock->cycle_number}",
                    'card_id' => $unlock->customer_id,
                    'title' => $unlock->reward->title,
                    'claimed_at' => $unlock->claimed_at,
                ])
                ->values()
            : collect();

        $payload = [
            'cards' => $cards->map(fn (Customer $card): array => [
                ...$card->toArray(),
                'venue' => $card->venue,
                'summary' => $loyalty->cardListSummary($card),
                'promotion' => $campaigns->promotionForCustomer($card),
                ...($isList ? [
                    'recent_visits' => $card->visits->map(fn ($visit): array => [
                        'id' => $visit->id,
                        'created_at' => $visit->created_at,
                    ])->values(),
                ] : []),
            ])->values(),
            'active_card' => $activeCard,
            'next_reward' => $activeCard ? $loyalty->nextRewardFor($activeCard) : null,
            'available_rewards' => $activeCard ? $loyalty->availableRewardsFor($activeCard) : [],
            'pending_unlocks' => $activeCard
                ? $loyalty->pendingUnlocksFor($activeCard)
                    ->map(fn (RewardUnlock $unlock): array => [
                        'unlock_id' => $unlock->id,
                        'reward' => $unlock->reward,
                    ])
                    ->values()
                : [],
            'journey' => $activeCard ? $loyalty->journeyFor($activeCard) : null,
            'recent_visits' => $activeCard ? $activeCard->visits()->latest()->limit(10)->get() : [],
            'promotion' => $activeCard ? $campaigns->promotionForCustomer($activeCard) : null,
            'pending_rewards_count' => $cards->sum(
                fn (Customer $card): int => $loyalty->pendingRewardCountFor($card),
            ),
        ];

        if ($isList) {
            $payload['claimed_history'] = $claimedHistory;
            $payload['home_campaigns'] = $campaigns->homeCampaignsForCards($cards);
        }

        return response()->json($payload);
    }

    public function wallet(Request $request, LoyaltyStampService $loyalty): JsonResponse
    {
        $cards = Customer::query()
            ->where('user_id', $request->user()->id)
            ->with('venue')
            ->orderBy('venue_id')
            ->get();

        foreach ($cards as $card) {
            $loyalty->syncEligibleUnlocks($card);
        }

        $items = $cards->flatMap(function (Customer $card) use ($loyalty): array {
            return $loyalty->pendingUnlocksFor($card)
                ->map(fn ($unlock): array => [
                    'unlock_id' => $unlock->id,
                    'customer' => $card,
                    'reward' => $unlock->reward,
                ])
                ->all();
        })->values();

        return response()->json([
            'items' => $items,
            'pending_count' => $cards->sum(
                fn (Customer $card): int => $loyalty->pendingRewardCountFor($card),
            ),
        ]);
    }

    public function join(Request $request, Venue $venue): JsonResponse
    {
        $customer = Customer::firstOrCreate(
            [
                'venue_id' => $venue->id,
                'user_id' => $request->user()->id,
            ],
            [
                'qr_token' => (string) Str::uuid(),
                'stamps' => 0,
            ],
        );

        if ($customer->wasRecentlyCreated) {
            AuditLog::loyalty('customer.joined', $customer, $request->user(), 'success', [
                'status' => 'success',
            ]);
        }

        return response()->json([
            'customer' => $customer->load('venue'),
        ], 201);
    }

    public function card(Request $request, Customer $customer, LoyaltyStampService $loyalty): JsonResponse
    {
        CustomerAccess::requireCustomer($request->user(), $customer);

        $customer->load('venue');
        $loyalty->syncEligibleUnlocks($customer);

        return response()->json([
            'active_card' => $customer,
            'customer' => $customer,
            'next_reward' => $loyalty->nextRewardFor($customer),
            'available_rewards' => $loyalty->availableRewardsFor($customer),
            'pending_unlocks' => $loyalty->pendingUnlocksFor($customer)
                ->map(fn (RewardUnlock $unlock): array => [
                    'unlock_id' => $unlock->id,
                    'reward' => $unlock->reward,
                ])
                ->values(),
            'journey' => $loyalty->journeyFor($customer),
            'recent_visits' => $customer->visits()->latest()->limit(10)->get(),
        ]);
    }

    public function rewards(Request $request, Customer $customer, LoyaltyStampService $loyalty): JsonResponse
    {
        CustomerAccess::requireCustomer($request->user(), $customer);

        return response()->json([
            'rewards' => $customer->venue->rewards()
                ->where('active', true)
                ->orderBy('required_stamps')
                ->get(),
            'journey' => $loyalty->journeyFor($customer),
        ]);
    }

    public function redeem(Request $request, Customer $customer, Reward $reward, LoyaltyStampService $loyalty): JsonResponse
    {
        CustomerAccess::requireCustomer($request->user(), $customer);

        $unlock = $loyalty->redeemReward($customer, $reward, $request->user());

        return response()->json($loyalty->redeemApiPayload($customer, $unlock), 201);
    }

    public function createClaimSession(
        Request $request,
        RewardUnlock $unlock,
        RedemptionClaimService $claims,
        LoyaltyStampService $loyalty,
    ): JsonResponse {
        $unlock->load('customer', 'reward');

        CustomerAccess::requireUnlock($request->user(), $unlock);

        $loyalty->syncEligibleUnlocks($unlock->customer);
        $unlock = $unlock->fresh(['customer', 'reward']);

        $session = $claims->createClaimSession($unlock);

        return response()->json(
            $claims->claimSessionPayload($session, $request->root()),
            201,
        );
    }

    public function claimSessionStatus(
        Request $request,
        string $token,
        RedemptionClaimService $claims,
    ): JsonResponse {
        $session = RedemptionRequest::query()
            ->where('token', $token)
            ->with('rewardUnlock.customer', 'rewardUnlock.reward')
            ->firstOrFail();

        CustomerAccess::requireClaimSession($request->user(), $session);

        return response()->json(
            $claims->claimSessionPayload($session, $request->root()),
        );
    }
}
