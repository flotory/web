<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AddStampRequest;
use App\Http\Requests\RedeemScanRequest;
use App\Http\Requests\StaffScanRequest;
use App\Models\Customer;
use App\Models\User;
use App\Models\Venue;
use App\Services\LoyaltyStampService;
use App\Services\RedemptionClaimService;
use App\Services\ScannerService;
use App\Support\VenueAccess;
use Illuminate\Http\JsonResponse;

class StaffScanController extends Controller
{
    public function lookup(
        AddStampRequest $request,
        Venue $venue,
        LoyaltyStampService $loyalty,
        ScannerService $scanner,
    ): JsonResponse {
        VenueAccess::requireAccess($request->user(), $venue, ['owner', 'staff']);

        $customer = $this->resolveCustomerForStamp($request, $venue, $scanner, $request->user());
        $joinedOnScan = (bool) ($customer->wasRecentlyCreated ?? false);

        $customer->load('user', 'venue');

        return response()->json([
            'customer' => $customer,
            'next_reward' => $loyalty->nextRewardFor($customer),
            'available_rewards' => $loyalty->availableRewardsFor($customer),
            'journey' => $loyalty->journeyFor($customer),
            'recent_visits' => $customer->visits()->latest()->limit(5)->get(),
            'active_campaign' => app(\App\Services\CampaignService::class)->scannerContextFor($customer),
            'joined_on_scan' => $joinedOnScan,
        ]);
    }

    public function addStamp(
        AddStampRequest $request,
        Venue $venue,
        LoyaltyStampService $loyalty,
        RedemptionClaimService $claims,
        ScannerService $scanner,
    ): JsonResponse {
        VenueAccess::requireAccess($request->user(), $venue, ['owner', 'staff']);

        $customer = $this->resolveCustomerForStamp($request, $venue, $scanner, $request->user());
        $joinedOnScan = (bool) ($customer->wasRecentlyCreated ?? false);

        $customer->load('user');

        $payload = $loyalty->addStamp($customer, $request->user(), $request->integer('stamps', 1));
        $payload['scan_type'] = 'stamp';
        $payload['pending_claim_warning'] = $claims->pendingClaimWarningFor($customer->fresh());
        $payload['joined_on_scan'] = $joinedOnScan;

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
        ScannerService $scanner,
    ): JsonResponse {
        VenueAccess::requireAccess($request->user(), $venue, ['owner', 'staff']);

        $parsed = $scanner->parseScan($request->string('scan')->toString());

        if ($parsed['type'] === 'redeem') {
            return response()->json(
                $claims->redeemByToken($parsed['token'], $venue, $request->user()),
                201,
            );
        }

        $customer = $scanner->resolveCustomerForStampToken(
            $parsed['token'],
            $venue,
            $request->user(),
        );
        $joinedOnScan = (bool) ($customer->wasRecentlyCreated ?? false);

        $customer->load('user');

        $payload = $loyalty->addStamp($customer, $request->user(), $request->integer('stamps', 1));
        $payload['scan_type'] = 'stamp';
        $payload['pending_claim_warning'] = $claims->pendingClaimWarningFor($customer->fresh());
        $payload['joined_on_scan'] = $joinedOnScan;

        return response()->json($payload, 201);
    }

    private function resolveCustomerForStamp(
        AddStampRequest $request,
        Venue $venue,
        ScannerService $scanner,
        User $staff,
    ): Customer {
        if ($request->filled('customer_id')) {
            return $scanner->resolveCustomerById($request->integer('customer_id'), $venue);
        }

        return $scanner->resolveCustomerForStampToken(
            $request->string('qr_token')->toString(),
            $venue,
            $staff,
        );
    }
}
