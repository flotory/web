<?php

namespace Tests\Unit;

use App\Models\Brand;
use App\Models\Venue;
use App\Services\VenueTimezoneService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class VenueTimezoneServiceTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['services.google.maps_server_key' => 'test-server-key']);
    }

    public function test_resolve_for_coordinates_returns_timezone_from_google_api(): void
    {
        Http::fake([
            'maps.googleapis.com/maps/api/timezone/json*' => Http::response([
                'status' => 'OK',
                'timeZoneId' => 'Europe/Warsaw',
            ]),
        ]);

        $timezone = app(VenueTimezoneService::class)->resolveForCoordinates(53.0101, 18.6101);

        $this->assertSame('Europe/Warsaw', $timezone);

        Http::assertSent(function ($request): bool {
            return str_contains($request->url(), 'maps.googleapis.com/maps/api/timezone/json')
                && $request['location'] === '53.0101,18.6101'
                && $request['key'] === 'test-server-key';
        });
    }

    public function test_resolve_returns_null_without_coordinates(): void
    {
        Http::fake();

        $service = app(VenueTimezoneService::class);

        $this->assertNull($service->resolveForCoordinates(null, 18.6101));
        $this->assertNull($service->resolveForCoordinates(53.0101, null));

        Http::assertNothingSent();
    }

    public function test_resolve_returns_null_when_api_key_missing(): void
    {
        config(['services.google.maps_server_key' => null]);
        Http::fake();

        $timezone = app(VenueTimezoneService::class)->resolveForCoordinates(53.0101, 18.6101);

        $this->assertNull($timezone);
        Http::assertNothingSent();
    }

    public function test_resolve_returns_null_when_google_returns_error_status(): void
    {
        Http::fake([
            'maps.googleapis.com/maps/api/timezone/json*' => Http::response([
                'status' => 'REQUEST_DENIED',
                'errorMessage' => 'This API key is not authorized to use this service or API.',
            ]),
        ]);

        $timezone = app(VenueTimezoneService::class)->resolveForCoordinates(53.0101, 18.6101);

        $this->assertNull($timezone);
    }

    public function test_apply_to_venue_persists_resolved_timezone(): void
    {
        Http::fake([
            'maps.googleapis.com/maps/api/timezone/json*' => Http::response([
                'status' => 'OK',
                'timeZoneId' => 'America/Los_Angeles',
            ]),
        ]);

        $venue = $this->createVenue([
            'latitude' => 34.0522,
            'longitude' => -118.2437,
            'timezone' => null,
        ]);

        app(VenueTimezoneService::class)->applyToVenue($venue, 34.0522, -118.2437);

        $this->assertSame('America/Los_Angeles', $venue->fresh()->timezone);
    }

    public function test_apply_to_venue_leaves_timezone_unchanged_when_lookup_fails(): void
    {
        Http::fake([
            'maps.googleapis.com/maps/api/timezone/json*' => Http::response([
                'status' => 'REQUEST_DENIED',
            ]),
        ]);

        $brand = Brand::query()->create([
            'name' => 'No TZ Cafe',
            'slug' => 'no-tz-cafe',
            'category' => 'cafe',
            'status' => Brand::STATUS_DRAFT,
        ]);

        $venue = Venue::query()->create([
            'brand_id' => $brand->id,
            'is_primary' => true,
            'name' => 'No TZ Cafe',
            'slug' => 'no-tz-cafe',
            'latitude' => 34.0522,
            'longitude' => -118.2437,
            'timezone' => 'Europe/Warsaw',
        ]);

        app(VenueTimezoneService::class)->applyToVenue($venue, 34.0522, -118.2437);

        $this->assertSame('Europe/Warsaw', $venue->fresh()->timezone);
    }
}
