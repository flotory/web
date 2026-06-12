<?php

namespace Tests\Unit;

use App\Models\Campaign;
use App\Services\CampaignEngine;
use App\Support\CampaignTemplates;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class CampaignEngineTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    private CampaignEngine $engine;

    protected function setUp(): void
    {
        parent::setUp();
        $this->engine = app(CampaignEngine::class);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_vip_matches_when_rewards_claimed_meets_threshold(): void
    {
        $venue = $this->createVenue();
        $guest = $this->createUser(['email' => 'vip-claimed@example.com']);
        $customer = $this->createCustomer($venue, $guest, ['lifetime_stamps' => 1]);
        $owner = $this->createUser(['email' => 'vip-owner@example.com']);
        $this->attachMember($venue, $owner, 'owner');
        $reward = $this->createReward($venue);

        $this->createRewardUnlock($customer, $reward, [
            'claimed_at' => now()->subDay(),
            'claimed_by' => $guest->id,
        ]);
        $this->createRewardUnlock($customer, $reward, [
            'cycle_number' => 2,
            'claimed_at' => now(),
            'claimed_by' => $guest->id,
        ]);

        $this->seedActiveCampaign($venue, $owner, CampaignTemplates::VIP, [
            'stamp_multiplier' => 2,
            'min_lifetime_stamps' => 99,
            'min_rewards_claimed' => 2,
        ]);

        $this->assertSame(2, $this->engine->multiplierFor($customer, $venue));
    }

    public function test_is_schedule_open_returns_false_for_expired_campaign(): void
    {
        $venue = $this->createVenue();
        $owner = $this->createUser(['email' => 'expired-owner@example.com']);
        $this->attachMember($venue, $owner, 'owner');

        Carbon::setTestNow(Carbon::parse('2026-06-02 12:00:00'));

        $campaign = Campaign::query()->create([
            'venue_id' => $venue->id,
            'template_id' => CampaignTemplates::QUIET_DAY,
            'name' => 'Expired quiet day',
            'status' => Campaign::STATUS_ACTIVE,
            'config' => [
                'stamp_multiplier' => 2,
                'days_of_week' => [2],
                'duration_days' => 7,
            ],
            'starts_at' => Carbon::parse('2026-05-01 00:00:00'),
            'ends_at' => Carbon::parse('2026-05-10 00:00:00'),
            'activated_at' => Carbon::parse('2026-05-01 00:00:00'),
            'created_by' => $owner->id,
        ]);

        $this->assertFalse($this->engine->isScheduleOpen($campaign, $venue));
    }

    public function test_bring_back_matches_customer_with_no_visits_but_old_join_date(): void
    {
        $venue = $this->createVenue();
        $guest = $this->createUser(['email' => 'bringback-new@example.com']);
        $customer = $this->createCustomer($venue, $guest);
        $customer->forceFill(['created_at' => now()->subDays(45)])->saveQuietly();
        $owner = $this->createUser(['email' => 'bringback-owner@example.com']);
        $this->attachMember($venue, $owner, 'owner');

        $this->seedActiveCampaign($venue, $owner, CampaignTemplates::BRING_BACK, [
            'stamp_multiplier' => 2,
            'inactive_days' => 30,
            'duration_days' => 14,
        ]);

        $this->assertSame(2, $this->engine->multiplierFor($customer->fresh(), $venue));
    }

    public function test_bring_back_does_not_match_recently_active_customer(): void
    {
        $venue = $this->createVenue();
        $guest = $this->createUser(['email' => 'active-guest@example.com']);
        $customer = $this->createCustomer($venue, $guest);
        $owner = $this->createUser(['email' => 'active-owner@example.com']);
        $this->attachMember($venue, $owner, 'owner');
        $this->createVisit($customer, $owner, ['created_at' => now()->subDays(3)]);

        $this->seedActiveCampaign($venue, $owner, CampaignTemplates::BRING_BACK, [
            'stamp_multiplier' => 2,
            'inactive_days' => 30,
            'duration_days' => 14,
        ]);

        $this->assertSame(1, $this->engine->multiplierFor($customer, $venue));
    }

    public function test_unknown_template_id_does_not_match(): void
    {
        $venue = $this->createVenue();
        $guest = $this->createUser(['email' => 'unknown-template@example.com']);
        $customer = $this->createCustomer($venue, $guest);
        $owner = $this->createUser(['email' => 'unknown-owner@example.com']);
        $this->attachMember($venue, $owner, 'owner');

        Campaign::query()->create([
            'venue_id' => $venue->id,
            'template_id' => 'legacy_unknown_template',
            'name' => 'Legacy',
            'status' => Campaign::STATUS_ACTIVE,
            'config' => ['stamp_multiplier' => 3],
            'activated_at' => now(),
            'created_by' => $owner->id,
        ]);

        $this->assertSame(1, $this->engine->multiplierFor($customer, $venue));
    }
}
