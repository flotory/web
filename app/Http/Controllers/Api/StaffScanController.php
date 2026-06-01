<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AddStampRequest;
use App\Http\Requests\RedeemScanRequest;
use App\Http\Requests\StaffScanRequest;
use App\Support\LoyaltyQr;
use App\Models\Customer;
use App\Models\Venue;
use App\Services\LoyaltyStampService;
use App\Services\RedemptionClaimService;
use App\Support\VenueAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

class StaffScanController extends Controller
{
    public function lookup(AddStampRequest $request, Venue $venue, LoyaltyStampService $loyalty): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner', 'staff']);

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

    public function addStamp(
        AddStampRequest $request,
        Venue $venue,
        LoyaltyStampService $loyalty,
        RedemptionClaimService $claims,
    ): JsonResponse {
        VenueAccess::requireAccess($request->user(), $venue, ['owner', 'staff']);

        $customer = Customer::query()
            ->where('venue_id', $venue->id)
            ->where('qr_token', $request->string('qr_token')->toString())
            ->first();

        if (! $customer) {
            throw ValidationException::withMessages([
                'qr_token' => "This QR belongs to another venue or is not enrolled at {$venue->name}.",
            ]);
        }

        $customer->load('user');

        $payload = $loyalty->addStamp($customer, $request->user(), $request->integer('stamps', 1));
        $payload['scan_type'] = 'stamp';
        $payload['pending_claim_warning'] = $claims->pendingClaimWarningFor($customer->fresh());

        return response()->json($payload, 201);
    }

    public function redeem(
        RedeemScanRequest $request,
        Venue $venue,
        RedemptionClaimService $claims,
    ): JsonResponse {
        VenueAccess::requireAccess($request->user(), $venue, ['owner', 'staff']);

        return response()->json(
            $claims->redeemByToken(
                $request->string('redemption_token')->toString(),
                $venue,
                $request->user(),
            ),
            201,
        );
    }

    public function scan(
        StaffScanRequest $request,
        Venue $venue,
        LoyaltyStampService $loyalty,
        RedemptionClaimService $claims,
    ): JsonResponse {
        VenueAccess::requireAccess($request->user(), $venue, ['owner', 'staff']);

        $parsed = LoyaltyQr::parse($request->string('scan')->toString());

        if ($parsed === null) {
            throw ValidationException::withMessages([
                'scan' => 'Unrecognized QR. Use the customer stamp card or their Rewards claim screen.',
            ]);
        }

        if ($parsed['type'] === 'redeem') {
            return response()->json(
                $claims->redeemByToken($parsed['token'], $venue, $request->user()),
                201,
            );
        }

        $customer = Customer::query()
            ->where('venue_id', $venue->id)
            ->where('qr_token', $parsed['token'])
            ->first();

        if (! $customer) {
            throw ValidationException::withMessages([
                'scan' => "This QR belongs to another venue or is not enrolled at {$venue->name}.",
            ]);
        }

        $customer->load('user');

        $payload = $loyalty->addStamp($customer, $request->user(), $request->integer('stamps', 1));
        $payload['scan_type'] = 'stamp';
        $payload['pending_claim_warning'] = $claims->pendingClaimWarningFor($customer->fresh());

        return response()->json($payload, 201);
    }
}
