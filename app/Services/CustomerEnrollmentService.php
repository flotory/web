<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\User;
use App\Models\Venue;
use App\Support\AuditLog;

class CustomerEnrollmentService
{
    public function findAtVenue(User $user, Venue $venue): ?Customer
    {
        $loyaltyVenue = $venue->loyaltyVenue();

        return Customer::query()
            ->where('venue_id', $loyaltyVenue->id)
            ->where('user_id', $user->id)
            ->first();
    }

    /**
     * Return existing loyalty card or create one (silent join on first scan).
     */
    public function findOrJoin(User $user, Venue $venue, ?User $joinedVia = null, string $source = 'nfc_auto_join'): Customer
    {
        $loyaltyVenue = $venue->loyaltyVenue();

        $customer = Customer::query()->firstOrCreate(
            [
                'venue_id' => $loyaltyVenue->id,
                'user_id' => $user->id,
            ],
            [
                'stamps' => 0,
            ],
        );

        if ($customer->wasRecentlyCreated) {
            AuditLog::loyalty('customer.joined', $customer, $joinedVia ?? $user, 'success', [
                'status' => 'success',
                'source' => $source,
                'scan_venue_id' => $venue->id !== $loyaltyVenue->id ? $venue->id : null,
            ]);
        }

        return $customer;
    }
}
