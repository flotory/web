<?php

namespace Tests\Unit;

use App\Models\Campaign;
use App\Services\CampaignService;
use App\Support\CampaignTemplates;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class CampaignServiceTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    private CampaignService $campaigns;

    protected function setUp(): void
    {
        parent::setUp();
        $this->campaigns = app(CampaignService::class);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_multiplier_is_max_of_matching_campaigns_not_product(): void
    {
        $venue = $this->createVenue();
        $guest = $this->createUser(['email' => 'guest@example.com']);
        $customer = $this->createCustomer($venue, $guest, ['stamps' => 2]);
        $owner = $this->createUser(['email' => 'owner@example.com']);
        $this->attachMember($venue, $owner, 'owner');

        Carbon::setTestNow(Carbon::parse('2026-06-02 16:00:00')); // Tuesday (ISO 2)

        $this->seedActiveCampaign($venue, $owner, CampaignTemplates::QUIET_DAY, [
            'stamp_multiplier' => 2,
            'days_of_week' => [2],
        ]);

        $this->seedActiveCampaign($venue, $owner, CampaignTemplates::HAPPY_HOUR, [
            'stamp_multiplier' => 3,
            'days_of_week' => [2],
            'start_time' => '15:00',
            'end_time' => '18:00',
        ]);

        $this->assertSame(3, $this->campaigns->multiplierFor($customer, $venue));
    }

    public function test_two_matching_two_x_campaigns_yield_multiplier_two(): void
    {
        $venue = $this->createVenue();
        $guest = $this->createUser(['email' => 'guest2@example.com']);
        $customer = $this->createCustomer($venue, $guest);
        $owner = $this->createUser(['email' => 'owner2@example.com']);
        $this->attachMember($venue, $owner, 'owner');

        Carbon::setTestNow(Carbon::parse('2026-06-02 12:00:00')); // Tuesday

        $this->seedActiveCampaign($venue, $owner, CampaignTemplates::QUIET_DAY, [
            'stamp_multiplier' => 2,
            'days_of_week' => [2],
        ]);

        $this->seedActiveCampaign($venue, $owner, CampaignTemplates::VIP, [
            'stamp_multiplier' => 2,
            'min_lifetime_stamps' => 1,
            'min_rewards_claimed' => 0,
        ]);

        $customer->forceFill(['lifetime_stamps' => 1])->save();

        $this->assertSame(2, $this->campaigns->multiplierFor($customer, $venue));
    }

    public function test_expired_campaign_does_not_apply(): void
    {
        $venue = $this->createVenue();
        $guest = $this->createUser(['email' => 'guest3@example.com']);
        $customer = $this->createCustomer($venue, $guest);
        $owner = $this->createUser(['email' => 'owner3@example.com']);
        $this->attachMember($venue, $owner, 'owner');

        Carbon::setTestNow(Carbon::parse('2026-06-02 12:00:00'));

        Campaign::query()->create([
            'venue_id' => $venue->id,
            'template_id' => CampaignTemplates::QUIET_DAY,
            'name' => 'Expired quiet day',
            'status' => Campaign::STATUS_ACTIVE,
            'config' => [
                'stamp_multiplier' => 3,
                'days_of_week' => [2],
                'duration_days' => 7,
            ],
            'starts_at' => Carbon::parse('2026-05-01 00:00:00'),
            'ends_at' => Carbon::parse('2026-05-10 00:00:00'),
            'activated_at' => Carbon::parse('2026-05-01 00:00:00'),
            'created_by' => $owner->id,
        ]);

        $this->assertSame(1, $this->campaigns->multiplierFor($customer, $venue));
    }

    public function test_quiet_day_does_not_match_on_wrong_weekday(): void
    {
        $venue = $this->createVenue();
        $guest = $this->createUser(['email' => 'guest4@example.com']);
        $customer = $this->createCustomer($venue, $guest);
        $owner = $this->createUser(['email' => 'owner4@example.com']);
        $this->attachMember($venue, $owner, 'owner');

        Carbon::setTestNow(Carbon::parse('2026-06-01 12:00:00')); // Monday (ISO 1)

        $this->seedActiveCampaign($venue, $owner, CampaignTemplates::QUIET_DAY, [
            'stamp_multiplier' => 2,
            'days_of_week' => [2], // Tuesday only
        ]);

        $this->assertSame(1, $this->campaigns->multiplierFor($customer, $venue));
    }

    public function test_bring_back_matches_inactive_customer(): void
    {
        $venue = $this->createVenue();
        $guest = $this->createUser(['email' => 'guest5@example.com']);
        $customer = $this->createCustomer($venue, $guest);
        $owner = $this->createUser(['email' => 'owner5@example.com']);
        $this->attachMember($venue, $owner, 'owner');
        $this->createVisit($customer, $owner, ['created_at' => now()->subDays(40)]);

        $this->seedActiveCampaign($venue, $owner, CampaignTemplates::BRING_BACK, [
            'stamp_multiplier' => 2,
            'inactive_days' => 30,
            'duration_days' => 14,
        ]);

        $this->assertSame(2, $this->campaigns->multiplierFor($customer, $venue));
    }

    public function test_vip_matches_loyal_customer_by_visits(): void
    {
        $venue = $this->createVenue();
        $guest = $this->createUser(['email' => 'guest6@example.com']);
        $customer = $this->createCustomer($venue, $guest);
        $owner = $this->createUser(['email' => 'owner6@example.com']);
        $this->attachMember($venue, $owner, 'owner');

        foreach (range(1, 5) as $index) {
            $this->createVisit($customer, $owner, ['created_at' => now()->subDays($index)]);
        }

        $this->seedActiveCampaign($venue, $owner, CampaignTemplates::VIP, [
            'stamp_multiplier' => 2,
            'min_visits' => 5,
            'min_rewards_claimed' => 99,
        ]);

        $this->assertSame(2, $this->campaigns->multiplierFor($customer, $venue));
    }

    public function test_happy_hour_matches_inside_window_only(): void
    {
        $venue = $this->createVenue();
        $guest = $this->createUser(['email' => 'guest7@example.com']);
        $customer = $this->createCustomer($venue, $guest);
        $owner = $this->createUser(['email' => 'owner7@example.com']);
        $this->attachMember($venue, $owner, 'owner');

        $this->seedActiveCampaign($venue, $owner, CampaignTemplates::HAPPY_HOUR, [
            'stamp_multiplier' => 2,
            'days_of_week' => [2],
            'start_time' => '15:00',
            'end_time' => '18:00',
        ]);

        Carbon::setTestNow(Carbon::parse('2026-06-02 16:00:00'));
        $this->assertSame(2, $this->campaigns->multiplierFor($customer, $venue));

        Carbon::setTestNow(Carbon::parse('2026-06-02 20:00:00'));
        $this->assertSame(1, $this->campaigns->multiplierFor($customer, $venue));
    }

    public function test_winning_campaign_returns_highest_multiplier_campaign(): void
    {
        $venue = $this->createVenue();
        $guest = $this->createUser(['email' => 'guest8@example.com']);
        $customer = $this->createCustomer($venue, $guest);
        $owner = $this->createUser(['email' => 'owner8@example.com']);
        $this->attachMember($venue, $owner, 'owner');

        Carbon::setTestNow(Carbon::parse('2026-06-02 16:00:00'));

        $this->seedActiveCampaign($venue, $owner, CampaignTemplates::QUIET_DAY, [
            'stamp_multiplier' => 2,
            'days_of_week' => [2],
        ], 'Quiet 2x');

        $high = $this->seedActiveCampaign($venue, $owner, CampaignTemplates::HAPPY_HOUR, [
            'stamp_multiplier' => 3,
            'days_of_week' => [2],
            'start_time' => '15:00',
            'end_time' => '18:00',
        ], 'Happy 3x');

        $winner = $this->campaigns->winningCampaignFor($customer, $venue);

        $this->assertNotNull($winner);
        $this->assertSame($high->id, $winner->id);
        $this->assertSame('Happy 3x', $winner->name);
    }

    public function test_vip_matches_when_current_stamp_reaches_lifetime_threshold(): void
    {
        $venue = $this->createVenue();
        $guest = $this->createUser(['email' => 'vip-threshold@example.com']);
        $customer = $this->createCustomer($venue, $guest, ['lifetime_stamps' => 4]);
        $owner = $this->createUser(['email' => 'vip-owner@example.com']);
        $this->attachMember($venue, $owner, 'owner');

        $this->seedActiveCampaign($venue, $owner, CampaignTemplates::VIP, [
            'stamp_multiplier' => 2,
            'min_lifetime_stamps' => 5,
            'min_rewards_claimed' => 99,
        ]);

        $this->assertSame(2, $this->campaigns->multiplierFor($customer, $venue, null, 1));
    }

    public function test_happy_hour_supports_overnight_time_window(): void
    {
        $venue = $this->createVenue();
        $guest = $this->createUser(['email' => 'overnight@example.com']);
        $customer = $this->createCustomer($venue, $guest);
        $owner = $this->createUser(['email' => 'overnight-owner@example.com']);
        $this->attachMember($venue, $owner, 'owner');

        Carbon::setTestNow(Carbon::parse('2026-06-02 23:30:00'));

        try {
            $this->seedActiveCampaign($venue, $owner, CampaignTemplates::HAPPY_HOUR, [
                'stamp_multiplier' => 2,
                'days_of_week' => [2],
                'start_time' => '22:00',
                'end_time' => '02:00',
            ]);

            $this->assertSame(2, $this->campaigns->multiplierFor($customer, $venue));
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_happy_hour_uses_venue_timezone(): void
    {
        $venue = $this->createVenue(['timezone' => 'America/Los_Angeles']);
        $guest = $this->createUser(['email' => 'tz-guest@example.com']);
        $customer = $this->createCustomer($venue, $guest);
        $owner = $this->createUser(['email' => 'tz-owner@example.com']);
        $this->attachMember($venue, $owner, 'owner');

        Carbon::setTestNow(Carbon::parse('2026-06-02 22:30:00', 'UTC'));

        try {
            $this->seedActiveCampaign($venue, $owner, CampaignTemplates::HAPPY_HOUR, [
                'stamp_multiplier' => 2,
                'days_of_week' => [2],
                'start_time' => '15:00',
                'end_time' => '18:00',
            ]);

            $this->assertSame(2, $this->campaigns->multiplierFor($customer, $venue));
        } finally {
            Carbon::setTestNow();
        }
    }

    /**
     * @param  array<string, mixed>  $config
     */
    private function seedActiveCampaign(
        \App\Models\Venue $venue,
        \App\Models\User $owner,
        string $templateId,
        array $config,
        ?string $name = null,
    ): Campaign {
        $defaults = CampaignTemplates::defaults($templateId);
        $merged = array_merge($defaults['config'], $config);

        return Campaign::query()->create([
            'venue_id' => $venue->id,
            'template_id' => $templateId,
            'name' => $name ?? $defaults['name'],
            'status' => Campaign::STATUS_ACTIVE,
            'config' => $merged,
            'push_enabled' => true,
            'activated_at' => now(),
            'created_by' => $owner->id,
            'audience_count' => 0,
        ]);
    }
}
