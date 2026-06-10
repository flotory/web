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
        return Customer::query()
            ->where('venue_id', $venue->id)
            ->where('user_id', $user->id)
            ->first();
    }

    /**
     * Return existing loyalty card or create one (silent join on first scan).
     */
    public function findOrJoin(User $user, Venue $venue, ?User $joinedVia = null, string $source = 'scanner_auto_join'): Customer
    {
        $customer = Customer::query()->firstOrCreate(
            [
                'venue_id' => $venue->id,
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
            ]);
        }

        return $customer;
    }
}
