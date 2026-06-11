<?php

namespace Tests\Unit;

use App\Models\CustomerRewardCycle;
use App\Models\RewardUnlock;
use App\Services\LoyaltyStampService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
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
