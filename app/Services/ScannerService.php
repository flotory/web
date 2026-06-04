<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\User;
use App\Models\Venue;
use App\Support\LoyaltyConfig;
use App\Support\LoyaltyQr;
use Illuminate\Validation\ValidationException;

class ScannerService
{
    public function __construct(
        private UniversalCustomerQrService $universalQr,
        private CustomerEnrollmentService $enrollment,
    ) {}

    public function resolveCustomerForStampToken(string $token, Venue $venue, ?User $staff = null): Customer
    {
        $normalized = $this->normalizeStampToken($token);

        if ($this->universalQr->isEnabled()) {
            $user = $this->universalQr->resolveUser($normalized);

            if ($user) {
                return $this->enrollment->findOrJoin($user, $venue, $staff);
            }
        }

        if (LoyaltyConfig::legacyCardQrEnabled()) {
            $customer = Customer::query()
                ->where('venue_id', $venue->id)
                ->where('qr_token', $normalized)
                ->first();

            if ($customer) {
                return $customer;
            }
        }

        throw ValidationException::withMessages([
            'qr_token' => $this->universalQr->isEnabled()
                ? 'Ask the guest to open My QR in the Flotory app (per-venue card QRs are no longer accepted).'
                : "This QR is not enrolled at {$venue->name}. Ask the guest to join the program first.",
        ]);
    }

    public function resolveCustomerById(int $customerId, Venue $venue): Customer
    {
        $customer = Customer::query()
            ->where('venue_id', $venue->id)
            ->whereKey($customerId)
            ->first();

        if (! $customer) {
            throw ValidationException::withMessages([
                'customer_id' => 'Customer not found at this venue.',
            ]);
        }

        return $customer;
    }

    private function normalizeStampToken(string $token): string
    {
        $parsed = LoyaltyQr::parse($token);

        if ($parsed !== null && $parsed['type'] === 'stamp') {
            return $parsed['token'];
        }

        return strtolower(trim($token));
    }

    /**
     * @return array{type: 'stamp', token: string}|array{type: 'redeem', token: string}
     */
    public function parseScan(string $raw): array
    {
        $parsed = LoyaltyQr::parse($raw);

        if ($parsed === null) {
            throw ValidationException::withMessages([
                'scan' => 'Unrecognized QR. Use the customer My QR or their Rewards claim screen.',
            ]);
        }

        return $parsed;
    }
}
