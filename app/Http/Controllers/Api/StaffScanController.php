<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AddStampRequest;
use App\Models\Customer;
use App\Models\Venue;
use App\Services\LoyaltyStampService;
use App\Support\VenueAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

class StaffScanController extends Controller
{
    public function lookup(AddStampRequest $request, Venue $venue, LoyaltyStampService $loyalty): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner', 'manager', 'staff']);

        $customer = Customer::query()
            ->where('venue_id', $venue->id)
            ->where('qr_token', $request->string('qr_token')->toString())
            ->with('user', 'venue')
            ->first();

        if (! $customer) {
            throw ValidationException::withMessages([
                'qr_token' => "This QR belongs to another venue or is not enrolled at {$venue->name}.",
            ]);
        }

        return response()->json([
            'customer' => $customer,
            'next_reward' => $loyalty->nextRewardFor($customer),
            'available_rewards' => $loyalty->availableRewardsFor($customer),
            'journey' => $loyalty->journeyFor($customer),
            'recent_visits' => $customer->visits()->latest()->limit(5)->get(),
        ]);
    }

    public function addStamp(AddStampRequest $request, Venue $venue, LoyaltyStampService $loyalty): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner', 'manager', 'staff']);

        $customer = Customer::query()
            ->where('venue_id', $venue->id)
            ->where('qr_token', $request->string('qr_token')->toString())
            ->first();

        if (! $customer) {
            throw ValidationException::withMessages([
                'qr_token' => "This QR belongs to another venue or is not enrolled at {$venue->name}.",
            ]);
        }

        return response()->json(
            $loyalty->addStamp($customer, $request->user(), $request->integer('stamps', 1)),
            201,
        );
    }
}
