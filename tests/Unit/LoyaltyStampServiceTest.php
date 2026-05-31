<?php

namespace Tests\Unit;

use App\Services\LoyaltyStampService;
use App\Support\VenueAccess;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class LoyaltyStampServiceTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

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

    public function test_admin_can_access_any_venue_without_membership(): void
    {
        $admin = $this->createUser(['is_admin' => true]);
        $venue = $this->createVenue();

        $this->assertTrue(VenueAccess::canAccess($admin, $venue, ['owner']));
        $this->assertTrue(VenueAccess::canAccess($admin, $venue));
    }

    public function test_non_member_cannot_access_venue(): void
    {
        $user = $this->createUser();
        $venue = $this->createVenue();

        $this->assertFalse(VenueAccess::canAccess($user, $venue, ['owner']));
    }
}
