<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\RewardUnlock;
use App\Models\Venue;
use App\Services\CustomerEnrollmentService;
use App\Services\CampaignService;
use App\Services\LoyaltyStampService;
use App\Services\VenuePublicationService;
use App\Support\CustomerAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
class CustomerLoyaltyController extends Controller
{
    public function mine(Request $request, LoyaltyStampService $loyalty, CampaignService $campaigns): JsonResponse
    {
        $cards = Customer::query()
            ->where('user_id', $request->user()->id)
            ->with([
                'venue',
                'brand.venues' => fn ($query) => $query->where('is_primary', true),
                'visits' => fn ($query) => $query->latest()->limit(2),
            ])
            ->orderBy('brand_id')
            ->get();

        $activeCard = $this->resolveActiveCard($cards, $request->integer('venue_id') ?: null);

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
            ->orderBy('brand_id')
            ->get();

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

    public function join(Request $request, Venue $venue, VenuePublicationService $publication, CustomerEnrollmentService $enrollment): JsonResponse
    {
        $publication->assertPublic($venue);

        $customer = $enrollment->findOrJoin($request->user(), $venue, $request->user(), 'manual_join');

        return response()->json([
            'customer' => $customer->load('venue', 'brand'),
            'joined' => $customer->wasRecentlyCreated,
        ], $customer->wasRecentlyCreated ? 201 : 200);
    }

    public function card(Request $request, Customer $customer, LoyaltyStampService $loyalty): JsonResponse
    {
        CustomerAccess::requireCustomer($request->user(), $customer);

        $customer->load('venue');

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

        $customer->loadMissing('brand');

        return response()->json([
            'rewards' => $customer->brand->rewards()
                ->where('active', true)
                ->orderBy('required_stamps')
                ->get(),
            'journey' => $loyalty->journeyFor($customer),
        ]);
    }

    public function redeemUnlock(Request $request, RewardUnlock $unlock, LoyaltyStampService $loyalty): JsonResponse
    {
        $unlock->load('customer', 'reward');

        CustomerAccess::requireUnlock($request->user(), $unlock);

        $claimed = $loyalty->redeemUnlock($unlock, $request->user());

        return response()->json(
            $loyalty->redeemApiPayload($unlock->customer, $claimed),
            201,
        );
    }

    /**
     * @param  \Illuminate\Support\Collection<int, Customer>  $cards
     */
    private function resolveActiveCard($cards, ?int $venueId): ?Customer
    {
        if ($venueId === null) {
            return $cards->first();
        }

        $match = $cards->first(fn (Customer $card): bool => (int) $card->venue_id === $venueId);
        if ($match instanceof Customer) {
            return $match;
        }

        $brandId = Venue::query()->whereKey($venueId)->value('brand_id');
        if ($brandId === null) {
            return null;
        }

        return $cards->first(fn (Customer $card): bool => (int) $card->brand_id === (int) $brandId);
    }

}
