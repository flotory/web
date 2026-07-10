<?php

namespace Tests\Unit;

use App\Models\CustomerRewardCycle;
use App\Models\RewardUnlock;
use App\Services\CampaignService;
use App\Services\LoyaltyStampService;
use App\Support\CampaignTemplates;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;
use Mockery;
use RuntimeException;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class LoyaltyStampServiceTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    public function test_add_stamp_increments_balance_and_unlocks_milestone(): void
    {
        $staff = $this->createUser();
        $customerUser = $this->createUser(['email' => 'guest@example.com']);
        $venue = $this->createVenue();
        $customer = $this->createCustomer($venue, $customerUser, ['stamps' => 4]);
        $reward = $this->createReward($venue, ['required_stamps' => 5]);
        $this->createRewardCycle($customer);

        $result = app(LoyaltyStampService::class)->addStamp($customer, $staff, 1);

        $this->assertSame(0, $result['customer']->stamps);
        $this->assertTrue($result['cycle_completed']);
        $this->assertCount(1, $result['available_rewards']);
        $this->assertTrue($result['available_rewards']->first()->is($reward));
        $this->assertDatabaseHas('reward_unlocks', [
            'customer_id' => $customer->id,
            'reward_id' => $reward->id,
            'cycle_number' => 1,
            'claimed_at' => null,
        ]);
    }

    public function test_add_stamp_unlocks_multiple_milestones_in_one_scan(): void
    {
        $staff = $this->createUser();
        $customerUser = $this->createUser(['email' => 'guest@example.com']);
        $venue = $this->createVenue();
        $customer = $this->createCustomer($venue, $customerUser, ['stamps' => 0]);
        $small = $this->createReward($venue, ['title' => 'Free Cookie', 'required_stamps' => 3, 'sort_order' => 3]);
        $large = $this->createReward($venue, ['title' => 'Free Meal', 'required_stamps' => 10, 'sort_order' => 10]);
        $this->createRewardCycle($customer);

        $result = app(LoyaltyStampService::class)->addStamp($customer, $staff, 10);

        $this->assertSame(0, $result['customer']->stamps);
        $this->assertTrue($result['cycle_completed']);
        $this->assertCount(2, $result['available_rewards']);
        $this->assertDatabaseHas('reward_unlocks', [
            'customer_id' => $customer->id,
            'reward_id' => $small->id,
            'cycle_number' => 1,
        ]);
        $this->assertDatabaseHas('reward_unlocks', [
            'customer_id' => $customer->id,
            'reward_id' => $large->id,
            'cycle_number' => 1,
        ]);
    }

    public function test_add_stamp_rejects_duplicate_scan_within_cooldown_window(): void
    {
        $staff = $this->createUser();
        $customerUser = $this->createUser(['email' => 'guest@example.com']);
        $venue = $this->createVenue();
        $customer = $this->createCustomer($venue, $customerUser, ['stamps' => 1]);
        $this->createReward($venue);
        $this->createRewardCycle($customer);
        $this->createVisit($customer, $staff);

        $this->expectException(ValidationException::class);

        app(LoyaltyStampService::class)->addStamp($customer->fresh(), $staff, 1);
    }

    public function test_add_stamp_rejects_immediate_rescan_after_successful_stamp(): void
    {
        $staff = $this->createUser();
        $customerUser = $this->createUser(['email' => 'guest@example.com']);
        $venue = $this->createVenue();
        $customer = $this->createCustomer($venue, $customerUser, ['stamps' => 0]);
        $this->createReward($venue, ['required_stamps' => 10]);
        $this->createRewardCycle($customer);
        $service = app(LoyaltyStampService::class);

        $service->addStamp($customer->fresh(), $staff, 1);

        try {
            $service->addStamp($customer->fresh(), $staff, 1);
            $this->fail('Expected duplicate scan rejection.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('stamp', $exception->errors());
        }

        $this->assertSame(1, $customer->fresh()->stamps);
        $this->assertSame(1, $customer->visits()->count());
    }

    public function test_concurrent_scan_attempts_only_create_one_visit(): void
    {
        $staff = $this->createUser();
        $staffTwo = $this->createUser(['email' => 'staff2@example.com']);
        $customerUser = $this->createUser(['email' => 'guest@example.com']);
        $venue = $this->createVenue();
        $customer = $this->createCustomer($venue, $customerUser, ['stamps' => 0]);
        $this->createReward($venue, ['required_stamps' => 10]);
        $this->createRewardCycle($customer);
        $service = app(LoyaltyStampService::class);

        $service->addStamp($customer->fresh(), $staff, 1);

        try {
            $service->addStamp($customer->fresh(), $staffTwo, 1);
            $this->fail('Expected duplicate scan rejection for overlapping scan attempt.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('stamp', $exception->errors());
        }

        $this->assertSame(1, $customer->fresh()->stamps);
        $this->assertSame(1, $customer->visits()->count());
    }

    public function test_add_stamp_treats_zero_stamps_as_one(): void
    {
        $staff = $this->createUser();
        $customerUser = $this->createUser(['email' => 'guest@example.com']);
        $venue = $this->createVenue();
        $customer = $this->createCustomer($venue, $customerUser, ['stamps' => 0]);
        $this->createReward($venue, ['required_stamps' => 10]);
        $this->createRewardCycle($customer);

        $result = app(LoyaltyStampService::class)->addStamp($customer, $staff, 0);

        $this->assertSame(1, $result['customer']->stamps);
        $this->assertSame(1, $result['customer']->lifetime_stamps);
        $this->assertFalse($result['cycle_completed']);
    }

    public function test_redeem_unlock_claims_oldest_unlock_by_cycle_number(): void
    {
        $user = $this->createUser();
        $venue = $this->createVenue();
        $customer = $this->createCustomer($venue, $user, ['stamps' => 0]);
        $reward = $this->createReward($venue, ['required_stamps' => 5]);
        $this->createRewardCycle($customer, ['cycle_number' => 3, 'completed_at' => now()]);
        $older = $this->createRewardUnlock($customer, $reward, ['cycle_number' => 1]);
        $this->createRewardUnlock($customer, $reward, ['cycle_number' => 2]);

        $unlock = app(LoyaltyStampService::class)->redeemUnlock($older, $user);

        $this->assertTrue($unlock->is($older->fresh()));
        $this->assertNotNull($unlock->claimed_at);
        $this->assertSame(1, app(LoyaltyStampService::class)->pendingRewardCountFor($customer->fresh()));
    }

    public function test_journey_for_marks_unlocked_and_claimed_milestones_in_current_cycle(): void
    {
        $user = $this->createUser();
        $venue = $this->createVenue();
        $customer = $this->createCustomer($venue, $user, ['stamps' => 5]);
        $claimed = $this->createReward($venue, ['required_stamps' => 3, 'sort_order' => 3]);
        $pending = $this->createReward($venue, ['required_stamps' => 5, 'sort_order' => 5]);
        $locked = $this->createReward($venue, ['required_stamps' => 10, 'sort_order' => 10]);
        $this->createRewardCycle($customer);
        $this->createRewardUnlock($customer, $claimed, [
            'claimed_at' => now(),
            'claimed_by' => $user->id,
        ]);
        $this->createRewardUnlock($customer, $pending);

        $journey = app(LoyaltyStampService::class)->journeyFor($customer);

        $this->assertSame(5, $journey['current_stamps']);
        $milestones = collect($journey['milestones'])->keyBy('id');
        $this->assertTrue($milestones[$claimed->id]['unlocked']);
        $this->assertTrue($milestones[$claimed->id]['claimed']);
        $this->assertTrue($milestones[$pending->id]['unlocked']);
        $this->assertFalse($milestones[$pending->id]['claimed']);
        $this->assertFalse($milestones[$locked->id]['unlocked']);
    }

    public function test_available_rewards_returns_unlocked_unclaimed_milestones(): void
    {
        $user = $this->createUser();
        $venue = $this->createVenue();
        $customer = $this->createCustomer($venue, $user, ['stamps' => 5]);
        $reward = $this->createReward($venue, ['required_stamps' => 5]);
        $this->createRewardCycle($customer);
        $this->createRewardUnlock($customer, $reward);

        $available = app(LoyaltyStampService::class)->availableRewardsFor($customer);

        $this->assertCount(1, $available);
        $this->assertTrue($available->first()->is($reward));
    }

    public function test_available_rewards_includes_unclaimed_unlocks_from_previous_cycles(): void
    {
        $user = $this->createUser();
        $venue = $this->createVenue();
        $customer = $this->createCustomer($venue, $user, ['stamps' => 0]);
        $reward = $this->createReward($venue, ['required_stamps' => 5]);
        $this->createRewardCycle($customer, ['cycle_number' => 2, 'completed_at' => now()]);
        $this->createRewardUnlock($customer, $reward, ['cycle_number' => 1]);

        $available = app(LoyaltyStampService::class)->availableRewardsFor($customer);

        $this->assertCount(1, $available);
        $this->assertTrue($available->first()->is($reward));
        $this->assertSame(1, app(LoyaltyStampService::class)->pendingRewardCountFor($customer));
    }

    public function test_pending_unlocks_returns_one_row_per_unclaimed_reward(): void
    {
        $user = $this->createUser();
        $venue = $this->createVenue();
        $customer = $this->createCustomer($venue, $user, ['stamps' => 0]);
        $reward = $this->createReward($venue, ['required_stamps' => 5]);
        $this->createRewardCycle($customer, ['cycle_number' => 3, 'completed_at' => now()]);
        $this->createRewardUnlock($customer, $reward, ['cycle_number' => 1]);
        $this->createRewardUnlock($customer, $reward, ['cycle_number' => 2]);

        $pending = app(LoyaltyStampService::class)->pendingUnlocksFor($customer);

        $this->assertCount(2, $pending);
        $this->assertSame(2, app(LoyaltyStampService::class)->pendingRewardCountFor($customer));
        $this->assertTrue($pending->every(fn ($unlock) => $unlock->reward->is($reward)));
    }

    public function test_sync_eligible_unlocks_skips_already_claimed_milestone_in_current_cycle(): void
    {
        $user = $this->createUser();
        $venue = $this->createVenue();
        $customer = $this->createCustomer($venue, $user, ['stamps' => 5]);
        $reward = $this->createReward($venue, ['required_stamps' => 5]);
        $this->createRewardCycle($customer);
        $this->createRewardUnlock($customer, $reward, [
            'cycle_number' => 1,
            'claimed_at' => now(),
        ]);

        $loyalty = app(LoyaltyStampService::class);
        $loyalty->syncEligibleUnlocks($customer);

        $this->assertSame(0, $loyalty->pendingRewardCountFor($customer));
        $this->assertTrue($loyalty->journeyFor($customer)['milestones'][0]['claimed']);
    }

    public function test_add_stamp_carries_overflow_into_next_cycle(): void
    {
        $staff = $this->createUser();
        $customerUser = $this->createUser(['email' => 'overflow@example.com']);
        $venue = $this->createVenue();
        $customer = $this->createCustomer($venue, $customerUser, ['stamps' => 9]);
        $this->createReward($venue, ['required_stamps' => 10]);
        $this->createRewardCycle($customer);

        $result = app(LoyaltyStampService::class)->addStamp($customer, $staff, 3);

        $this->assertSame(2, $result['customer']->stamps);
        $this->assertTrue($result['cycle_completed']);
        $this->assertDatabaseHas('reward_unlocks', [
            'customer_id' => $customer->id,
            'cycle_number' => 1,
            'claimed_at' => null,
        ]);
        $this->assertDatabaseHas('customer_reward_cycles', [
            'customer_id' => $customer->id,
            'cycle_number' => 2,
            'completed_at' => null,
        ]);
    }

    public function test_add_stamp_can_complete_multiple_cycles_in_one_award(): void
    {
        $staff = $this->createUser();
        $customerUser = $this->createUser(['email' => 'multi-cycle@example.com']);
        $venue = $this->createVenue();
        $customer = $this->createCustomer($venue, $customerUser, ['stamps' => 8]);
        $this->createReward($venue, ['required_stamps' => 10]);
        $this->createRewardCycle($customer);

        $result = app(LoyaltyStampService::class)->addStamp($customer, $staff, 20);

        $this->assertSame(8, $result['customer']->stamps);
        $this->assertTrue($result['cycle_completed']);
        $this->assertSame(2, CustomerRewardCycle::query()->where('customer_id', $customer->id)->whereNotNull('completed_at')->count());
    }

    public function test_add_stamp_includes_active_campaign_when_multiplier_greater_than_one(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-02 12:00:00'));

        try {
            $staff = $this->createUser();
            $customerUser = $this->createUser(['email' => 'campaign-success@example.com']);
            $venue = $this->createVenue();
            $owner = $this->createUser(['email' => 'campaign-owner@example.com']);
            $this->attachMember($venue, $owner, 'owner');
            $customer = $this->createCustomer($venue, $customerUser, ['stamps' => 0]);
            $this->createReward($venue, ['required_stamps' => 10]);
            $this->createRewardCycle($customer);

            $this->seedActiveCampaign($venue, $owner, CampaignTemplates::QUIET_DAY, [
                'stamp_multiplier' => 2,
                'days_of_week' => [2],
            ]);

            $result = app(LoyaltyStampService::class)->addStamp($customer, $staff, 1);

            $this->assertSame(2, $result['added_stamps']);
            $this->assertSame(2, $result['stamp_multiplier']);
            $this->assertNotNull($result['active_campaign']);
            $this->assertSame(2, $result['active_campaign']['multiplier']);
            $this->assertSame(2, $result['customer']->stamps);
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_add_stamp_awards_base_stamp_when_campaign_multiplier_fails(): void
    {
        $customerUser = $this->createUser(['email' => 'campaign-fail@example.com']);
        $venue = $this->createVenue();
        $customer = $this->createCustomer($venue, $customerUser, ['stamps' => 0]);
        $this->createReward($venue, ['required_stamps' => 10]);
        $this->createRewardCycle($customer);

        $campaigns = Mockery::mock(CampaignService::class);
        $campaigns->shouldReceive('multiplierFor')
            ->once()
            ->andThrow(new RuntimeException('campaign unavailable'));

        $this->app->instance(CampaignService::class, $campaigns);

        $result = app(LoyaltyStampService::class)->addStamp($customer, $customerUser, 1);

        $this->assertSame(1, $result['customer']->stamps);
        $this->assertSame(1, $result['added_stamps']);
        $this->assertSame(1, $result['stamp_multiplier']);
        $this->assertNotNull($result['campaign_warning']);
        $this->assertNull($result['active_campaign']);
    }

    public function test_redeem_unlock_rejects_venue_mismatch(): void
    {
        $user = $this->createUser();
        $venueA = $this->createVenue();
        $venueB = $this->createVenue();
        $customer = $this->createCustomer($venueA, $user, ['stamps' => 5]);
        $foreignReward = $this->createReward($venueB, ['required_stamps' => 5]);
        $unlock = RewardUnlock::query()->create([
            'customer_id' => $customer->id,
            'reward_id' => $foreignReward->id,
            'cycle_number' => 1,
            'unlocked_at' => now(),
        ]);

        $this->expectException(ValidationException::class);

        app(LoyaltyStampService::class)->redeemUnlock($unlock, $user);
    }

    public function test_redeem_unlock_allows_inactive_reward_when_pending_unlock_exists(): void
    {
        $user = $this->createUser();
        $venue = $this->createVenue();
        $customer = $this->createCustomer($venue, $user, ['stamps' => 5]);
        $reward = $this->createReward($venue, ['required_stamps' => 5, 'active' => false]);
        $unlock = $this->createRewardUnlock($customer, $reward);

        $claimed = app(LoyaltyStampService::class)->redeemUnlock($unlock, $user);

        $this->assertNotNull($claimed->claimed_at);
    }

    public function test_redeem_unlock_rejects_already_claimed_unlock(): void
    {
        $user = $this->createUser();
        $venue = $this->createVenue();
        $customer = $this->createCustomer($venue, $user, ['stamps' => 5]);
        $reward = $this->createReward($venue, ['required_stamps' => 5]);
        $unlock = $this->createRewardUnlock($customer, $reward, [
            'claimed_at' => now(),
            'claimed_by' => $user->id,
        ]);

        $this->expectException(ValidationException::class);

        app(LoyaltyStampService::class)->redeemUnlock($unlock, $user);
    }

    public function test_redeem_api_payload_includes_wallet_state(): void
    {
        $user = $this->createUser();
        $venue = $this->createVenue();
        $customer = $this->createCustomer($venue, $user, ['stamps' => 2]);
        $reward = $this->createReward($venue, ['required_stamps' => 3, 'sort_order' => 3]);
        $this->createReward($venue, ['required_stamps' => 10, 'sort_order' => 10]);
        $this->createRewardCycle($customer);
        $unlock = $this->createRewardUnlock($customer, $reward);
        $claimed = app(LoyaltyStampService::class)->redeemUnlock($unlock, $user);

        $payload = app(LoyaltyStampService::class)->redeemApiPayload($customer, $claimed);

        $this->assertArrayHasKey('journey', $payload);
        $this->assertArrayHasKey('available_rewards', $payload);
        $this->assertArrayHasKey('recent_visits', $payload);
        $this->assertSame(2, $payload['journey']['current_stamps']);
    }

    public function test_card_list_summary_reflects_journey_state(): void
    {
        $user = $this->createUser();
        $venue = $this->createVenue();
        $customer = $this->createCustomer($venue, $user, ['stamps' => 3]);
        $cookie = $this->createReward($venue, [
            'title' => 'Earned Cookie',
            'required_stamps' => 3,
            'sort_order' => 3,
        ]);
        $this->createReward($venue, ['title' => 'Free Latte', 'required_stamps' => 5]);
        $this->createRewardCycle($customer);
        $this->createRewardUnlock($customer, $cookie);

        $summary = app(LoyaltyStampService::class)->cardListSummary($customer);

        $this->assertSame(3, $summary['stamps']);
        $this->assertSame(5, $summary['max_stamps']);
        $this->assertSame(1, $summary['pending_rewards_count']);
        $this->assertSame('Free Latte', $summary['next_reward_title']);
        $this->assertSame(5, $summary['next_reward_stamps']);
        $this->assertSame(2, $summary['stamps_to_next']);
        $this->assertArrayHasKey('next_reward_image', $summary);
        $this->assertArrayHasKey('next_reward_image_thumb', $summary);
    }

    public function test_add_stamp_starts_next_cycle_after_completion(): void
    {
        $staff = $this->createUser();
        $customerUser = $this->createUser(['email' => 'guest@example.com']);
        $venue = $this->createVenue();
        $customer = $this->createCustomer($venue, $customerUser, ['stamps' => 4]);
        $this->createReward($venue, ['required_stamps' => 5]);
        $this->createRewardCycle($customer);

        app(LoyaltyStampService::class)->addStamp($customer, $staff, 1);

        $activeCycle = CustomerRewardCycle::query()
            ->where('customer_id', $customer->id)
            ->whereNull('completed_at')
            ->first();

        $this->assertNotNull($activeCycle);
        $this->assertSame(2, $activeCycle->cycle_number);
    }
}
