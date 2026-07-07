<?php

namespace App\Support;

use App\Models\BrandUser;
use App\Models\User;
use App\Models\Venue;
use Illuminate\Database\Eloquent\Model;

class VenueAccess
{
    public static function isAdmin(User $user): bool
    {
        return $user->is_admin;
    }

    public static function membership(User $user, Venue $venue): ?BrandUser
    {
        $venue->loadMissing('brand');

        return BrandUser::query()
            ->where('brand_id', $venue->brand_id)
            ->where('user_id', $user->id)
            ->first();
    }

    /**
     * @param  array<int, string>  $roles
     */
    public static function assertNotPlatformAdmin(User $user): void
    {
        abort_if(self::isAdmin($user), 403, 'Platform admins cannot use venue owner tools.');
    }

    public static function canAccess(User $user, Venue $venue, array $roles = []): bool
    {
        if (self::isAdmin($user)) {
            return false;
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
        if (self::isAdmin($user)) {
            abort(403, 'Platform admins cannot use venue owner tools.');
        }

        $membership = self::membership($user, $venue);

        if (! $membership) {
            abort(404, 'This venue is not in your workspace.');
        }

        if ($roles !== [] && ! in_array($membership->role, $roles, true)) {
            abort(403, 'You do not have permission to manage this venue.');
        }
    }

    public static function requireVenueModel(Venue $venue, Model $model, string $venueKey = 'venue_id'): void
    {
        abort_unless((int) $model->getAttribute($venueKey) === (int) $venue->id, 404);
    }

    public static function requireBrandModel(Venue $venue, Model $model, string $brandKey = 'brand_id'): void
    {
        abort_unless((int) $model->getAttribute($brandKey) === (int) $venue->brand_id, 404);
    }
}
