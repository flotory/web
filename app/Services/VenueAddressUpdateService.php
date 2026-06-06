<?php

namespace App\Services;

use App\Models\User;
use App\Models\Venue;
use App\Models\VenueAddressChange;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

class VenueAddressUpdateService
{
    public const DAILY_LIMIT = 3;

    /**
     * @return array{limit: int, used_today: int, remaining: int}
     */
    public function quotaFor(Venue $venue, ?Carbon $now = null): array
    {
        $usedToday = $this->changesTodayCount($venue, $now);
        $remaining = max(0, self::DAILY_LIMIT - $usedToday);

        return [
            'limit' => self::DAILY_LIMIT,
            'used_today' => $usedToday,
            'remaining' => $remaining,
        ];
    }

    /**
     * @param  array{address: ?string, latitude: ?float, longitude: ?float, google_place_id: ?string}  $next
     */
    public function assertCanApply(Venue $venue, array $next, bool $enforceDailyLimit, ?Carbon $now = null): void
    {
        if (! $this->locationChanged($venue, $next)) {
            return;
        }

        if ($this->hasAddressWithoutCoordinates($next)) {
            throw ValidationException::withMessages([
                'address' => 'Select a location from Google address suggestions so we can save map coordinates.',
            ]);
        }

        if (! $enforceDailyLimit) {
            return;
        }

        if ($this->changesTodayCount($venue, $now) >= self::DAILY_LIMIT) {
            throw ValidationException::withMessages([
                'address' => 'You can update the venue address up to '.self::DAILY_LIMIT.' times per day. Try again tomorrow.',
            ]);
        }
    }

    /**
     * @param  array{address: ?string, latitude: ?float, longitude: ?float, google_place_id: ?string}  $next
     */
    public function recordChangeIfNeeded(Venue $venue, User $user, array $next, ?Carbon $now = null): void
    {
        if (! $this->locationChanged($venue, $next)) {
            return;
        }

        VenueAddressChange::query()->create([
            'venue_id' => $venue->id,
            'user_id' => $user->id,
            'created_at' => ($now ?? now())->toDateTimeString(),
        ]);
    }

    /**
     * @param  array{address: ?string, latitude: ?float, longitude: ?float, google_place_id: ?string}  $next
     */
    public function locationChanged(Venue $venue, array $next): bool
    {
        $currentAddress = $this->normalizeAddress($venue->address);
        $nextAddress = $this->normalizeAddress($next['address'] ?? null);

        if ($currentAddress !== $nextAddress) {
            return true;
        }

        return ! $this->coordinatesEqual($venue->latitude, $next['latitude'] ?? null)
            || ! $this->coordinatesEqual($venue->longitude, $next['longitude'] ?? null);
    }

    /**
     * @param  array{address: ?string, latitude: ?float, longitude: ?float, google_place_id: ?string}  $next
     */
    public function normalizedLocation(array $next): array
    {
        $address = $this->normalizeAddress($next['address'] ?? null);

        if ($address === null) {
            return [
                'address' => null,
                'latitude' => null,
                'longitude' => null,
                'google_place_id' => null,
            ];
        }

        return [
            'address' => $address,
            'latitude' => $next['latitude'] ?? null,
            'longitude' => $next['longitude'] ?? null,
            'google_place_id' => $this->normalizePlaceId($next['google_place_id'] ?? null),
        ];
    }

    private function changesTodayCount(Venue $venue, ?Carbon $now = null): int
    {
        $moment = $now ?? now();

        return VenueAddressChange::query()
            ->where('venue_id', $venue->id)
            ->where('created_at', '>=', $moment->copy()->startOfDay())
            ->where('created_at', '<=', $moment->copy()->endOfDay())
            ->count();
    }

    /**
     * @param  array{address: ?string, latitude: ?float, longitude: ?float, google_place_id: ?string}  $next
     */
    private function hasAddressWithoutCoordinates(array $next): bool
    {
        $address = $this->normalizeAddress($next['address'] ?? null);

        if ($address === null) {
            return false;
        }

        return $next['latitude'] === null || $next['longitude'] === null;
    }

    private function normalizeAddress(?string $address): ?string
    {
        if ($address === null) {
            return null;
        }

        $trimmed = trim($address);

        return $trimmed === '' ? null : $trimmed;
    }

    private function normalizePlaceId(?string $placeId): ?string
    {
        if ($placeId === null) {
            return null;
        }

        $trimmed = trim($placeId);

        return $trimmed === '' ? null : $trimmed;
    }

    private function coordinatesEqual(mixed $left, mixed $right): bool
    {
        if ($left === null && $right === null) {
            return true;
        }

        if ($left === null || $right === null) {
            return false;
        }

        return abs((float) $left - (float) $right) < 0.0000001;
    }
}
