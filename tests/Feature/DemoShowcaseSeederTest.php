<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\User;
use App\Models\Venue;
use App\Models\Visit;
use App\Services\VenueAnalyticsService;
use App\Support\DashboardPeriod;
use Database\Seeders\DemoShowcaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DemoShowcaseSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_database_seeder_builds_one_year_of_demo_cafe_analytics(): void
    {
        $this->seed();

        $venue = Venue::query()->where('slug', 'demo-cafe')->firstOrFail();
        $owner = User::query()->where('email', 'owner@example.com')->firstOrFail();

        $this->assertSame(1, Venue::query()->count());
        $this->assertGreaterThanOrEqual(DemoShowcaseSeeder::MIN_MONTHLY_VISITS * DemoShowcaseSeeder::MONTHS_OF_HISTORY, Visit::query()->where('venue_id', $venue->id)->count());
        $this->assertGreaterThanOrEqual(DemoShowcaseSeeder::GUEST_COUNT, Customer::query()->where('brand_id', $venue->brand_id)->count());

        $twelveMonths = DashboardPeriod::fromPreset('12m');
        $monthlyActivity = app(VenueAnalyticsService::class)->monthlyActivityForVenue($venue, $twelveMonths);
        $this->assertGreaterThanOrEqual(12, count($monthlyActivity));

        $monthsWithVisits = array_values(array_filter(
            $monthlyActivity,
            fn (array $row): bool => $row['visits'] > 0,
        ));
        $this->assertNotEmpty($monthsWithVisits);

        foreach ($monthsWithVisits as $row) {
            $this->assertGreaterThanOrEqual(DemoShowcaseSeeder::MIN_MONTHLY_VISITS, $row['visits'], $row['label'].' below minimum');
            $this->assertLessThanOrEqual(DemoShowcaseSeeder::MAX_MONTHLY_VISITS, $row['visits'], $row['label'].' above maximum');
        }

        Sanctum::actingAs($owner);

        $this->getJson("/api/dashboard?venue_id={$venue->id}&period=12m")
            ->assertOk()
            ->assertJsonPath('has_loyalty_activity', true)
            ->assertJsonPath('period.preset', '12m')
            ->assertJsonCount(count($monthlyActivity), 'monthly_activity')
            ->assertJsonPath('stats.total_customers', Customer::query()->where('brand_id', $venue->brand_id)->count());
    }
}
