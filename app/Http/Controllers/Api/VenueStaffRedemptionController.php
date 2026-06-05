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
        VenueAccess::requireAccess($request->user(), $venue, ['owner', 'staff']);
        VenueAccess::requireVenueModel($venue, $customer);
        VenueAccess::requireVenueModel($venue, $reward);

        $unlock = $loyalty->redeemReward($customer, $reward, $request->user());

        return response()->json($loyalty->redeemApiPayload($customer, $unlock), 201);
    }
}

