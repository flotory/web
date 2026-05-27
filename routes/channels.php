<?php

use App\Models\Customer;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('customer.{customerId}', function (User $user, int $customerId): bool {
    return Customer::query()
        ->whereKey($customerId)
        ->where('user_id', $user->id)
        ->exists();
});
