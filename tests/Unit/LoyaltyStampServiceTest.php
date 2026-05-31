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
