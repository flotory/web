<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class VenueStaffRedemptionControllerTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    public function test_staff_can_redeem_unlocked_reward_for_customer(): void
    {
        $staff = $this->createUser(['email' => 'staff@example.com']);
        $customerUser = $this->createUser(['email' => 'customer@example.com']);
        $venue = $this->createVenue();

        $this->attachMember($venue, $staff, 'staff');

        $customer = $this->createCustomer($venue, $customerUser, ['stamps' => 5]);
        $reward = $this->createReward($venue, [
            'title' => 'Free Mocha',
            'required_stamps' => 5,
        ]);

        $this->createRewardCycle($customer);
        $this->createRewardUnlock($customer, $reward);

        Sanctum::actingAs($staff);

        $this->postJson("/api/venues/{$venue->id}/customers/{$customer->id}/rewards/{$reward->id}/redeem")
            ->assertCreated()
            ->assertJsonPath('unlock.reward_id', $reward->id)
            ->assertJsonPath('unlock.claimed_by', $staff->id);

        $this->assertDatabaseHas('reward_unlocks', [
            'customer_id' => $customer->id,
            'reward_id' => $reward->id,
            'claimed_by' => $staff->id,
        ]);
    }

    public function test_customer_cannot_use_staff_redemption_endpoint(): void
    {
        $customerUser = $this->createUser();
        $venue = $this->createVenue();
        $customer = $this->createCustomer($venue, $customerUser, ['stamps' => 5]);
        $reward = $this->createReward($venue, ['required_stamps' => 5]);

        $this->createRewardCycle($customer);
        $this->createRewardUnlock($customer, $reward);

        Sanctum::actingAs($customerUser);

        $this->postJson("/api/venues/{$venue->id}/customers/{$customer->id}/rewards/{$reward->id}/redeem")
            ->assertForbidden();
    }
}
