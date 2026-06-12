<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class SyncVenueTimezonesCommandTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['services.google.maps_server_key' => 'test-server-key']);
    }

    public function test_command_syncs_missing_timezones(): void
    {
        Http::fake([
            'maps.googleapis.com/maps/api/timezone/json*' => Http::response([
                'status' => 'OK',
                'timeZoneId' => 'Europe/Warsaw',
            ]),
        ]);

        $venue = $this->createVenue([
            'latitude' => 53.0101,
            'longitude' => 18.6101,
            'timezone' => null,
        ]);

        $this->artisan('venues:sync-timezones')
            ->assertSuccessful();

        $this->assertSame('Europe/Warsaw', $venue->fresh()->timezone);
    }

    public function test_command_skips_venues_that_already_have_timezone(): void
    {
        Http::fake();

        $this->createVenue([
            'latitude' => 53.0101,
            'longitude' => 18.6101,
            'timezone' => 'Europe/Warsaw',
        ]);

        $this->artisan('venues:sync-timezones')
            ->expectsOutputToContain('0 updated, 1 skipped')
            ->assertSuccessful();

        Http::assertNothingSent();
    }

    public function test_command_fails_when_server_api_key_missing(): void
    {
        config(['services.google.maps_server_key' => null]);

        $this->artisan('venues:sync-timezones')
            ->expectsOutputToContain('GOOGLE_MAPS_SERVER_API_KEY is not set')
            ->assertFailed();
    }
}
