<?php

namespace Database\Seeders;

use App\Models\Campaign;
use App\Models\User;
use App\Models\Venue;
use App\Services\CampaignService;
use App\Support\CampaignTemplates;
use Illuminate\Database\Seeder;

/**
 * Idempotent demo campaigns for Demo Cafe (owner campaigns UI).
 */
class DemoCampaignsSeeder extends Seeder
{
    public function run(): void
    {
        $venue = Venue::query()->where('slug', 'demo-cafe')->first();
        $owner = User::query()->where('email', 'owner@example.com')->first();

        if (! $venue || ! $owner) {
            return;
        }

        $service = app(CampaignService::class);

        $quietConfig = [
            'stamp_multiplier' => 2,
            'days_of_week' => [1, 2, 3, 4, 5, 6, 7],
            'duration_days' => 30,
        ];

        Campaign::query()->updateOrCreate(
            [
                'venue_id' => $venue->id,
                'name' => 'Demo · Quiet Day Promotion',
            ],
            [
                'template_id' => CampaignTemplates::QUIET_DAY,
                'status' => Campaign::STATUS_ACTIVE,
                'config' => $quietConfig,
                'push_enabled' => true,
                'created_by' => $owner->id,
                'activated_at' => now()->subDays(5),
                'starts_at' => now()->subDays(5),
                'ends_at' => now()->addDays(25),
                'audience_count' => $service->audienceCountFor($venue, CampaignTemplates::QUIET_DAY, $quietConfig),
            ],
        );

        $happyConfig = [
            'stamp_multiplier' => 2,
            'days_of_week' => [1, 2, 3, 4, 5],
            'start_time' => '15:00',
            'end_time' => '18:00',
        ];

        Campaign::query()->updateOrCreate(
            [
                'venue_id' => $venue->id,
                'name' => 'Demo · Happy Hour',
            ],
            [
                'template_id' => CampaignTemplates::HAPPY_HOUR,
                'status' => Campaign::STATUS_ACTIVE,
                'config' => $happyConfig,
                'push_enabled' => true,
                'created_by' => $owner->id,
                'activated_at' => now()->subDays(3),
                'starts_at' => null,
                'ends_at' => null,
                'audience_count' => $service->audienceCountFor($venue, CampaignTemplates::HAPPY_HOUR, $happyConfig),
            ],
        );

        $bringBackConfig = [
            'stamp_multiplier' => 3,
            'inactive_days' => 30,
            'duration_days' => 14,
        ];

        Campaign::query()->updateOrCreate(
            [
                'venue_id' => $venue->id,
                'name' => 'Demo · Bring Back (ended)',
            ],
            [
                'template_id' => CampaignTemplates::BRING_BACK,
                'status' => Campaign::STATUS_ENDED,
                'config' => $bringBackConfig,
                'push_enabled' => false,
                'created_by' => $owner->id,
                'activated_at' => now()->subDays(45),
                'starts_at' => now()->subDays(45),
                'ends_at' => now()->subDays(31),
                'audience_count' => $service->audienceCountFor($venue, CampaignTemplates::BRING_BACK, $bringBackConfig),
            ],
        );
    }
}
