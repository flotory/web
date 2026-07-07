<?php

namespace Tests\Feature;

use App\Models\Campaign;
use App\Models\NfcTag;
use App\Models\Venue;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DatabaseSeederDemoCampaignsTest extends TestCase
{
    use RefreshDatabase;

    public function test_database_seeder_creates_demo_campaigns_for_demo_cafe(): void
    {
        $this->seed();

        $venue = Venue::query()->where('slug', 'demo-cafe')->firstOrFail();

        $this->assertSame(2, Campaign::query()
            ->where('brand_id', $venue->brand_id)
            ->where('status', Campaign::STATUS_ACTIVE)
            ->count());

        $this->assertDatabaseHas('campaigns', [
            'brand_id' => $venue->brand_id,
            'name' => 'Demo · Quiet Day Promotion',
            'status' => Campaign::STATUS_ACTIVE,
        ]);

        $this->assertDatabaseHas('nfc_tags', [
            'venue_id' => $venue->id,
            'label' => 'Counter stand',
            'active' => true,
        ]);

        $this->assertSame(
            DatabaseSeeder::DEMO_CAFE_NFC_TOKEN,
            NfcTag::query()->where('venue_id', $venue->id)->value('token'),
        );
    }
}
