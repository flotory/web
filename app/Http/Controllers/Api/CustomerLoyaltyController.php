<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Venue;
use App\Models\Reward;
use App\Services\LoyaltyStampService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CustomerLoyaltyController extends Controller
{
    public function mine(Request $request, LoyaltyStampService $loyalty): JsonResponse
    {
        $cards = Customer::query()
            ->where('user_id', $request->user()->id)
            ->with('venue')
            ->orderBy('venue_id')
            ->get();

        $activeCard = $request->integer('venue_id')
            ? $cards->firstWhere('venue_id', $request->integer('venue_id'))
            : $cards->first();

        return response()->json([
            'cards' => $cards,
            'active_card' => $activeCard,
            'next_reward' => $activeCard ? $loyalty->nextRewardFor($activeCard) : null,
            'available_rewards' => $activeCard ? $loyalty->availableRewardsFor($activeCard) : [],
            'journey' => $activeCard ? $loyalty->journeyFor($activeCard) : null,
            'recent_visits' => $activeCard ? $activeCard->visits()->latest()->limit(10)->get() : [],
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

        return response()->json([
            'customer' => $customer->load('venue'),
        ], 201);
    }

    public function card(Request $request, Customer $customer, LoyaltyStampService $loyalty): JsonResponse
    {
        abort_unless($customer->user_id === $request->user()->id, 403);

        $customer->load('venue');

        return response()->json([
            'customer' => $customer,
            'next_reward' => $loyalty->nextRewardFor($customer),
            'available_rewards' => $loyalty->availableRewardsFor($customer),
            'journey' => $loyalty->journeyFor($customer),
            'recent_visits' => $customer->visits()->latest()->limit(10)->get(),
        ]);
    }

    public function rewards(Request $request, Customer $customer, LoyaltyStampService $loyalty): JsonResponse
    {
        abort_unless($customer->user_id === $request->user()->id, 403);

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
        abort_unless($customer->user_id === $request->user()->id, 403);

        $unlock = $loyalty->redeemReward($customer, $reward, $request->user());

        return response()->json($loyalty->redeemApiPayload($customer, $unlock), 201);
    }
}
