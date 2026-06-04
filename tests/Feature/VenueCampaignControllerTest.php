<?php

namespace Tests\Feature;

use App\Models\Campaign;
use App\Support\CampaignTemplates;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class VenueCampaignControllerTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'loyalty.universal_qr_enabled' => true,
            'loyalty.legacy_card_qr_enabled' => false,
        ]);
    }

    public function test_owner_can_create_and_activate_bring_back_campaign(): void
    {
        $owner = $this->createUser();
        $guest = $this->createUser(['email' => 'inactive@example.com']);
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');
        $customer = $this->createCustomer($venue, $guest, ['stamps' => 2]);
        $staff = $this->createUser(['email' => 'staff@example.com']);
        $this->attachMember($venue, $staff, 'staff');
        $this->createVisit($customer, $staff, ['created_at' => now()->subDays(45)]);

        Sanctum::actingAs($owner);

        $this->postJson("/api/venues/{$venue->id}/campaigns", [
            'template_id' => CampaignTemplates::BRING_BACK,
            'activate' => true,
        ])
            ->assertCreated()
            ->assertJsonPath('campaign.status', Campaign::STATUS_ACTIVE)
            ->assertJsonPath('campaign.name', 'Bring Back Customers')
            ->assertJsonPath('campaign.multiplier', 2)
            ->assertJsonStructure([
                'campaign' => ['schedule_chips', 'schedule_summary', 'summary', 'status_label'],
            ]);

        $this->assertDatabaseHas('campaigns', [
            'venue_id' => $venue->id,
            'template_id' => CampaignTemplates::BRING_BACK,
            'status' => Campaign::STATUS_ACTIVE,
        ]);
    }

    public function test_multiple_active_campaigns_are_allowed(): void
    {
        $owner = $this->createUser();
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');

        Sanctum::actingAs($owner);

        $this->postJson("/api/venues/{$venue->id}/campaigns", [
            'template_id' => CampaignTemplates::QUIET_DAY,
            'activate' => true,
        ])->assertCreated();

        $this->postJson("/api/venues/{$venue->id}/campaigns", [
            'template_id' => CampaignTemplates::HAPPY_HOUR,
            'activate' => true,
        ])->assertCreated();

        $this->assertSame(2, Campaign::query()->where('venue_id', $venue->id)->where('status', Campaign::STATUS_ACTIVE)->count());
    }

    public function test_campaign_index_returns_enriched_campaigns_and_active_list(): void
    {
        $owner = $this->createUser();
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');

        Sanctum::actingAs($owner);

        $this->postJson("/api/venues/{$venue->id}/campaigns", [
            'template_id' => CampaignTemplates::VIP,
            'config' => ['stamp_multiplier' => 3, 'min_visits' => 3],
            'activate' => true,
        ])->assertCreated();

        $this->getJson("/api/venues/{$venue->id}/campaigns")
            ->assertOk()
            ->assertJsonPath('campaigns.0.template_id', CampaignTemplates::VIP)
            ->assertJsonPath('campaigns.0.multiplier', 3)
            ->assertJsonPath('campaigns.0.status_label', 'Running')
            ->assertJsonCount(1, 'active_campaigns')
            ->assertJsonPath('active_campaigns.0.multiplier', 3);
    }

    public function test_owner_can_update_campaign_config(): void
    {
        $owner = $this->createUser();
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');

        Sanctum::actingAs($owner);

        $create = $this->postJson("/api/venues/{$venue->id}/campaigns", [
            'template_id' => CampaignTemplates::BRING_BACK,
            'activate' => true,
        ])->assertCreated();

        $campaignId = $create->json('campaign.id');

        $this->patchJson("/api/venues/{$venue->id}/campaigns/{$campaignId}", [
            'name' => 'Win Back Summer',
            'config' => [
                'inactive_days' => 21,
                'duration_days' => 7,
                'stamp_multiplier' => 3,
            ],
        ])
            ->assertOk()
            ->assertJsonPath('campaign.name', 'Win Back Summer')
            ->assertJsonPath('campaign.multiplier', 3);

        $this->assertDatabaseHas('campaigns', [
            'id' => $campaignId,
            'name' => 'Win Back Summer',
        ]);
    }

    public function test_stamp_award_uses_highest_matching_multiplier(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-02 16:00:00'));

        $owner = $this->createUser();
        $guest = $this->createUser(['email' => 'guest@example.com']);
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');
        $staff = $this->createUser(['email' => 'staff@example.com']);
        $this->attachMember($venue, $staff, 'staff');
        $customer = $this->createCustomer($venue, $guest, ['stamps' => 1]);
        $this->createReward($venue, ['required_stamps' => 10]);
        $this->createRewardCycle($customer);

        Sanctum::actingAs($owner);

        $this->postJson("/api/venues/{$venue->id}/campaigns", [
            'template_id' => CampaignTemplates::QUIET_DAY,
            'config' => [
                'stamp_multiplier' => 2,
                'days_of_week' => [2],
            ],
            'activate' => true,
        ])->assertCreated();

        $this->postJson("/api/venues/{$venue->id}/campaigns", [
            'template_id' => CampaignTemplates::HAPPY_HOUR,
            'config' => [
                'stamp_multiplier' => 3,
                'days_of_week' => [2],
                'start_time' => '15:00',
                'end_time' => '18:00',
            ],
            'activate' => true,
        ])->assertCreated();

        Sanctum::actingAs($staff);

        $this->postJson("/api/venues/{$venue->id}/scanner/stamps", [
            'qr_token' => $this->stampQrForUser($guest),
            'stamps' => 1,
        ])
            ->assertCreated()
            ->assertJsonPath('added_stamps', 3)
            ->assertJsonPath('stamp_multiplier', 3)
            ->assertJsonPath('active_campaign.headline', '3× Stamps Active');

        Carbon::setTestNow();
    }

    public function test_stamp_award_doubles_for_inactive_customer_during_bring_back_campaign(): void
    {
        $owner = $this->createUser();
        $guest = $this->createUser(['email' => 'guest@example.com']);
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');
        $staff = $this->createUser(['email' => 'staff@example.com']);
        $this->attachMember($venue, $staff, 'staff');
        $customer = $this->createCustomer($venue, $guest, ['stamps' => 1]);
        $this->createReward($venue, ['required_stamps' => 10]);
        $this->createRewardCycle($customer);
        $this->createVisit($customer, $staff, ['created_at' => now()->subDays(40)]);

        Sanctum::actingAs($owner);

        $this->postJson("/api/venues/{$venue->id}/campaigns", [
            'template_id' => CampaignTemplates::BRING_BACK,
            'activate' => true,
        ])->assertCreated();

        Sanctum::actingAs($staff);

        $this->postJson("/api/venues/{$venue->id}/scanner/stamps", [
            'qr_token' => $this->stampQrForUser($guest),
            'stamps' => 1,
        ])
            ->assertCreated()
            ->assertJsonPath('added_stamps', 2)
            ->assertJsonPath('stamp_multiplier', 2);

        $customer->refresh();
        $this->assertSame(3, $customer->stamps);
    }

    public function test_dashboard_includes_campaign_recommendations_and_active_campaigns(): void
    {
        $owner = $this->createUser();
        $guest = $this->createUser(['email' => 'away@example.com']);
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');
        $customer = $this->createCustomer($venue, $guest);
        $staff = $this->createUser(['email' => 'staff2@example.com']);
        $this->attachMember($venue, $staff, 'staff');
        $this->createVisit($customer, $staff, ['created_at' => now()->subDays(50)]);

        Sanctum::actingAs($owner);

        $this->getJson("/api/dashboard?venue_id={$venue->id}")
            ->assertOk()
            ->assertJsonPath('campaign_recommendations.0.template_id', CampaignTemplates::BRING_BACK)
            ->assertJsonPath('campaign_recommendations.0.cta_label', 'Bring them back')
            ->assertJsonIsArray('active_campaigns');
    }

    public function test_campaign_preview_returns_audience_and_schedule(): void
    {
        $owner = $this->createUser();
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');

        Sanctum::actingAs($owner);

        $this->postJson("/api/venues/{$venue->id}/campaigns/preview", [
            'template_id' => CampaignTemplates::QUIET_DAY,
            'config' => [
                'days_of_week' => [1, 2, 3],
                'stamp_multiplier' => 2,
            ],
        ])
            ->assertOk()
            ->assertJsonPath('preview.multiplier', 2)
            ->assertJsonStructure([
                'preview' => [
                    'audience_count',
                    'schedule_chips',
                    'schedule_summary',
                    'summary',
                    'name',
                    'template_id',
                ],
            ]);
    }

    public function test_quiet_day_requires_days_of_week_when_config_empty(): void
    {
        $owner = $this->createUser();
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');

        Sanctum::actingAs($owner);

        $this->postJson("/api/venues/{$venue->id}/campaigns", [
            'template_id' => CampaignTemplates::QUIET_DAY,
            'config' => ['days_of_week' => []],
            'activate' => false,
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('config.days_of_week');
    }
}
