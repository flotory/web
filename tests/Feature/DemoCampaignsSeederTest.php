<?php

namespace Tests\Feature;

use App\Models\Campaign;
use App\Models\Venue;
use Database\Seeders\DemoAccountsSeeder;
use Database\Seeders\DemoCampaignsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DemoCampaignsSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_demo_campaigns_seeder_creates_active_and_ended_campaigns_for_demo_cafe(): void
    {
        $this->seed(DemoAccountsSeeder::class);
        $this->seed(DemoCampaignsSeeder::class);

        $venue = Venue::query()->where('slug', 'demo-cafe')->firstOrFail();

        $this->assertSame(2, Campaign::query()
            ->where('brand_id', $venue->brand_id)
            ->where('status', Campaign::STATUS_ACTIVE)
            ->count());

        $this->assertDatabaseHas('campaigns', [
            'brand_id' => $venue->brand_id,
            'name' => 'Demo · Bring Back (ended)',
            'status' => Campaign::STATUS_ENDED,
        ]);

        $this->seed(DemoCampaignsSeeder::class);

        $this->assertSame(2, Campaign::query()
            ->where('brand_id', $venue->brand_id)
            ->where('status', Campaign::STATUS_ACTIVE)
            ->count());
    }
}
