<?php

namespace App\Support;

use App\Enums\UserRole;
use App\Models\User;
use App\Models\Venue;
use App\Models\VenueUser;

class VenueAccess
{
    public static function isAdmin(User $user): bool
    {
        return $user->role === UserRole::Admin;
    }

    public static function membership(User $user, Venue $venue): ?VenueUser
    {
        return VenueUser::query()
            ->where('venue_id', $venue->id)
            ->where('user_id', $user->id)
            ->first();
    }

    /**
     * @param  array<int, string>  $roles
     */
    public static function canAccess(User $user, Venue $venue, array $roles = []): bool
    {
        if (self::isAdmin($user)) {
            return true;
        }

        $membership = self::membership($user, $venue);

        if (! $membership) {
            return false;
        }

        if ($roles === []) {
            return true;
        }

        return in_array($membership->role, $roles, true);
    }

    /**
     * @param  array<int, string>  $roles
     */
    public static function requireAccess(User $user, Venue $venue, array $roles = []): void
    {
        abort_unless(self::canAccess($user, $venue, $roles), 403);
    }
}

