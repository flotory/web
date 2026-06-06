<?php

namespace Tests\Unit;

use App\Models\VenueAddressChange;
use App\Services\VenueAddressUpdateService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class VenueAddressUpdateServiceTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    private VenueAddressUpdateService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = app(VenueAddressUpdateService::class);
    }

    public function test_update_is_blocked_after_three_address_changes_in_one_day(): void
    {
        $owner = $this->createUser();
        $venue = $this->createVenue([
            'address' => '12 Market Street, Torun',
            'latitude' => 53.0101,
            'longitude' => 18.6101,
        ]);
        $this->attachMember($venue, $owner, 'owner');

        $now = Carbon::parse('2026-06-06 15:00:00');

        foreach (range(1, 3) as $index) {
            VenueAddressChange::query()->create([
                'venue_id' => $venue->id,
                'user_id' => $owner->id,
                'created_at' => $now->copy()->subHours(4 - $index),
            ]);
        }

        $this->expectException(ValidationException::class);

        $this->service->assertCanApply($venue, [
            'address' => '99 New Street, Torun',
            'latitude' => 53.0202,
            'longitude' => 18.6202,
            'google_place_id' => 'place-new',
        ], enforceDailyLimit: true, now: $now);
    }

    public function test_unchanged_address_does_not_consume_daily_quota(): void
    {
        $venue = $this->createVenue([
            'address' => '12 Market Street, Torun',
            'latitude' => 53.0101,
            'longitude' => 18.6101,
        ]);

        $now = Carbon::parse('2026-06-06 15:00:00');

        foreach (range(1, 3) as $index) {
            VenueAddressChange::query()->create([
                'venue_id' => $venue->id,
                'user_id' => null,
                'created_at' => $now->copy()->subHours($index),
            ]);
        }

        $this->service->assertCanApply($venue, [
            'address' => '12 Market Street, Torun',
            'latitude' => 53.0101,
            'longitude' => 18.6101,
            'google_place_id' => null,
        ], enforceDailyLimit: true, now: $now);

        $this->assertFalse($this->service->locationChanged($venue, [
            'address' => '12 Market Street, Torun',
            'latitude' => 53.0101,
            'longitude' => 18.6101,
            'google_place_id' => null,
        ]));
    }

    public function test_address_requires_coordinates(): void
    {
        $venue = $this->createVenue();

        $this->expectException(ValidationException::class);

        $this->service->assertCanApply($venue, [
            'address' => '12 Market Street, Torun',
            'latitude' => null,
            'longitude' => null,
            'google_place_id' => null,
        ], enforceDailyLimit: false);
    }

    public function test_clearing_address_is_allowed_without_coordinates(): void
    {
        $venue = $this->createVenue([
            'address' => '12 Market Street, Torun',
            'latitude' => 53.0101,
            'longitude' => 18.6101,
        ]);

        $normalized = $this->service->normalizedLocation([
            'address' => '',
            'latitude' => null,
            'longitude' => null,
            'google_place_id' => null,
        ]);

        $this->service->assertCanApply($venue, $normalized, enforceDailyLimit: true);

        $this->assertNull($normalized['address']);
        $this->assertNull($normalized['latitude']);
        $this->assertNull($normalized['longitude']);
    }
}
