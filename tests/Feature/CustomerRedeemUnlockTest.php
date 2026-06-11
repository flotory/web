<?php

namespace Tests\Feature;

use App\Models\RewardUnlock;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class CustomerRedeemUnlockTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    public function test_customer_can_redeem_unlock_by_swipe(): void
    {
        $customerUser = $this->createUser(['email' => 'guest@example.com']);
        $venue = $this->createVenue();
        $customer = $this->createCustomer($venue, $customerUser, ['stamps' => 5]);
        $reward = $this->createReward($venue, ['required_stamps' => 5]);
        $unlock = RewardUnlock::query()->create([
            'customer_id' => $customer->id,
            'reward_id' => $reward->id,
            'cycle_number' => 1,
            'unlocked_at' => now(),
        ]);

        Sanctum::actingAs($customerUser);

        $this->postJson("/api/customer/rewards/unlocks/{$unlock->id}/redeem")
            ->assertCreated()
            ->assertJsonPath('unlock.id', $unlock->id)
            ->assertJsonPath('customer.id', $customer->id);

        $unlock->refresh();
        $this->assertNotNull($unlock->claimed_at);
        $this->assertSame($customerUser->id, $unlock->claimed_by);
    }

    public function test_customer_cannot_redeem_another_users_unlock(): void
    {
        $owner = $this->createUser(['email' => 'other@example.com']);
        $customerUser = $this->createUser(['email' => 'guest@example.com']);
        $venue = $this->createVenue();
        $customer = $this->createCustomer($venue, $customerUser, ['stamps' => 5]);
        $reward = $this->createReward($venue, ['required_stamps' => 5]);
        $unlock = RewardUnlock::query()->create([
            'customer_id' => $customer->id,
            'reward_id' => $reward->id,
            'cycle_number' => 1,
            'unlocked_at' => now(),
        ]);

        Sanctum::actingAs($owner);

        $this->postJson("/api/customer/rewards/unlocks/{$unlock->id}/redeem")
            ->assertForbidden();
    }

    public function test_customer_can_redeem_two_unlocks_for_same_reward_in_sequence(): void
    {
        $customerUser = $this->createUser(['email' => 'guest@example.com']);
        $venue = $this->createVenue();
        $customer = $this->createCustomer($venue, $customerUser, ['stamps' => 0]);
        $reward = $this->createReward($venue, ['required_stamps' => 5]);
        $this->createRewardCycle($customer, ['cycle_number' => 3, 'completed_at' => now()]);
        $firstUnlock = RewardUnlock::query()->create([
            'customer_id' => $customer->id,
            'reward_id' => $reward->id,
            'cycle_number' => 1,
            'unlocked_at' => now(),
        ]);
        $secondUnlock = RewardUnlock::query()->create([
            'customer_id' => $customer->id,
            'reward_id' => $reward->id,
            'cycle_number' => 2,
            'unlocked_at' => now(),
        ]);

        Sanctum::actingAs($customerUser);

        $this->postJson("/api/customer/rewards/unlocks/{$firstUnlock->id}/redeem")
            ->assertCreated()
            ->assertJsonPath('unlock.id', $firstUnlock->id);

        $this->postJson("/api/customer/rewards/unlocks/{$secondUnlock->id}/redeem")
            ->assertCreated()
            ->assertJsonPath('unlock.id', $secondUnlock->id);

        $this->getJson('/api/customer/rewards/wallet')
            ->assertOk()
            ->assertJsonPath('pending_count', 0)
            ->assertJsonCount(0, 'items');
    }

    public function test_customer_cannot_redeem_twice(): void
    {
        $customerUser = $this->createUser(['email' => 'guest@example.com']);
        $venue = $this->createVenue();
        $customer = $this->createCustomer($venue, $customerUser, ['stamps' => 5]);
        $reward = $this->createReward($venue, ['required_stamps' => 5]);
        $unlock = RewardUnlock::query()->create([
            'customer_id' => $customer->id,
            'reward_id' => $reward->id,
            'cycle_number' => 1,
            'unlocked_at' => now(),
            'claimed_at' => now(),
            'claimed_by' => $customerUser->id,
        ]);

        Sanctum::actingAs($customerUser);

        $this->postJson("/api/customer/rewards/unlocks/{$unlock->id}/redeem")
            ->assertStatus(422);
    }
}
