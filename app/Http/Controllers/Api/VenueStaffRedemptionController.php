<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Reward;
use App\Models\Venue;
use App\Services\LoyaltyStampService;
use App\Support\VenueAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VenueStaffRedemptionController extends Controller
{
    public function redeem(Request $request, Venue $venue, Customer $customer, Reward $reward, LoyaltyStampService $loyalty): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner', 'manager', 'staff']);
        abort_unless($customer->venue_id === $venue->id, 404);
        abort_unless($reward->venue_id === $venue->id, 404);

        $redemption = $loyalty->redeemReward($customer, $reward, $request->user());
        $customer = $customer->fresh()->load('venue', 'user');

        return response()->json([
            'redemption' => $redemption->load('reward'),
            'customer' => $customer,
            'next_reward' => $loyalty->nextRewardFor($customer),
            'available_rewards' => $loyalty->availableRewardsFor($customer),
            'recent_visits' => $customer->visits()->latest()->limit(10)->get(),
        ], 201);
    }
}

