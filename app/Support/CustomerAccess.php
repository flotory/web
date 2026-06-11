<?php

namespace App\Support;

use App\Models\Customer;
use App\Models\RewardUnlock;
use App\Models\User;

class CustomerAccess
{
    public static function requireCustomer(User $user, Customer $customer): void
    {
        abort_unless((int) $customer->user_id === (int) $user->id, 403);
    }

    public static function requireUnlock(User $user, RewardUnlock $unlock): void
    {
        self::requireCustomer($user, $unlock->customer);
    }
}
