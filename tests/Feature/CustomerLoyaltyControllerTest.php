<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class CustomerLoyaltyControllerTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    public function test_customer_can_join_a_venue_only_once(): void
    {
        $user = $this->createUser();
        $venue = $this->createVenue();

        Sanctum::actingAs($user);

        $firstResponse = $this->postJson("/api/venues/{$venue->slug}/join");
        $secondResponse = $this->postJson("/api/venues/{$venue->slug}/join");

        $firstResponse
            ->assertCreated()
            ->assertJsonPath('customer.venue_id', $venue->id)
            ->assertJsonPath('customer.user_id', $user->id);

        $secondResponse
            ->assertCreated()
            ->assertJsonPath('customer.id', $firstResponse->json('customer.id'));

        $this->assertDatabaseCount('customers', 1);
    }

    public function test_customer_can_view_their_own_card_details(): void
    {
        $user = $this->createUser();
        $venue = $this->createVenue();
        $customer = $this->createCustomer($venue, $user, ['stamps' => 3]);
        $reward = $this->createReward($venue, ['required_stamps' => 5]);
        $this->createRewardCycle($customer);

        Sanctum::actingAs($user);

        $this->getJson("/api/customers/{$customer->id}/card")
            ->assertOk()
            ->assertJsonPath('customer.id', $customer->id)
            ->assertJsonPath('customer.stamps', 3)
            ->assertJsonPath('next_reward.id', $reward->id)
            ->assertJsonPath('journey.current_stamps', 3);
    }

    public function test_customer_cannot_view_another_users_card(): void
    {
        $owner = $this->createUser();
        $intruder = $this->createUser(['email' => 'intruder@example.com']);
        $venue = $this->createVenue();
        $customer = $this->createCustomer($venue, $owner);

        Sanctum::actingAs($intruder);

        $this->getJson("/api/customers/{$customer->id}/card")
            ->assertForbidden();
    }

    public function test_customer_can_redeem_an_unlocked_reward(): void
    {
        $user = $this->createUser();
        $venue = $this->createVenue();
        $customer = $this->createCustomer($venue, $user, ['stamps' => 5]);
        $reward = $this->createReward($venue, [
            'title' => 'Free Cappuccino',
            'required_stamps' => 5,
        ]);

        $this->createRewardCycle($customer);
        $this->createRewardUnlock($customer, $reward);

        Sanctum::actingAs($user);

        $this->postJson("/api/customers/{$customer->id}/rewards/{$reward->id}/redeem")
            ->assertCreated()
            ->assertJsonPath('unlock.reward_id', $reward->id)
            ->assertJsonPath('unlock.claimed_by', $user->id)
            ->assertJsonPath('available_rewards', []);

        $this->assertDatabaseHas('reward_unlocks', [
            'customer_id' => $customer->id,
            'reward_id' => $reward->id,
            'claimed_by' => $user->id,
        ]);
    }

    public function test_customer_cannot_redeem_the_same_reward_twice_in_a_cycle(): void
    {
        $user = $this->createUser();
        $venue = $this->createVenue();
        $customer = $this->createCustomer($venue, $user, ['stamps' => 5]);
        $reward = $this->createReward($venue, ['required_stamps' => 5]);

        $this->createRewardCycle($customer);
        $this->createRewardUnlock($customer, $reward, [
            'claimed_at' => now()->subMinute(),
            'claimed_by' => $user->id,
        ]);

        Sanctum::actingAs($user);

        $this->postJson("/api/customers/{$customer->id}/rewards/{$reward->id}/redeem")
            ->assertStatus(422)
            ->assertJsonValidationErrors('reward');
    }

    public function test_customer_can_list_all_cards_and_filter_by_venue(): void
    {
        $user = $this->createUser();
        $venueA = $this->createVenue(['name' => 'Alpha']);
        $venueB = $this->createVenue(['name' => 'Beta']);
        $customerA = $this->createCustomer($venueA, $user, ['stamps' => 2]);
        $this->createCustomer($venueB, $user, ['stamps' => 1]);
        $this->createReward($venueA, ['required_stamps' => 5]);
        $this->createRewardCycle($customerA);
        $this->createVisit($customerA, $user);

        Sanctum::actingAs($user);

        $this->getJson('/api/customer/cards')
            ->assertOk()
            ->assertJsonCount(2, 'cards')
            ->assertJsonPath('active_card.venue_id', $venueA->id)
            ->assertJsonStructure(['journey', 'recent_visits', 'available_rewards']);

        $this->getJson("/api/customer/cards?venue_id={$venueB->id}")
            ->assertOk()
            ->assertJsonPath('active_card.venue_id', $venueB->id);
    }

    public function test_customer_can_view_rewards_journey(): void
    {
        $user = $this->createUser();
        $venue = $this->createVenue();
        $customer = $this->createCustomer($venue, $user, ['stamps' => 3]);
        $reward = $this->createReward($venue, ['required_stamps' => 5]);
        $this->createRewardCycle($customer);

        Sanctum::actingAs($user);

        $this->getJson("/api/customers/{$customer->id}/rewards")
            ->assertOk()
            ->assertJsonPath('rewards.0.id', $reward->id)
            ->assertJsonPath('journey.current_stamps', 3);
    }

    public function test_customer_can_list_pending_rewards_in_wallet(): void
    {
        $user = $this->createUser();
        $venue = $this->createVenue();
        $customer = $this->createCustomer($venue, $user, ['stamps' => 0]);
        $reward = $this->createReward($venue, [
            'title' => 'Free Latte',
            'required_stamps' => 5,
        ]);
        $this->createRewardCycle($customer, ['cycle_number' => 2, 'completed_at' => now()]);
        $this->createRewardUnlock($customer, $reward, ['cycle_number' => 1]);

        Sanctum::actingAs($user);

        $this->getJson('/api/customer/rewards/wallet')
            ->assertOk()
            ->assertJsonPath('pending_count', 1)
            ->assertJsonCount(1, 'items')
            ->assertJsonPath('items.0.reward.id', $reward->id)
            ->assertJsonPath('items.0.customer.id', $customer->id);

        $this->getJson('/api/customer/cards')
            ->assertOk()
            ->assertJsonPath('pending_rewards_count', 1);
    }

    public function test_customer_cannot_view_another_users_rewards(): void
    {
        $owner = $this->createUser();
        $intruder = $this->createUser(['email' => 'intruder@example.com']);
        $venue = $this->createVenue();
        $customer = $this->createCustomer($venue, $owner);

        Sanctum::actingAs($intruder);

        $this->getJson("/api/customers/{$customer->id}/rewards")
            ->assertForbidden();
    }

    public function test_customer_cannot_redeem_unavailable_reward(): void
    {
        $user = $this->createUser();
        $otherVenue = $this->createVenue(['name' => 'Other']);
        $venue = $this->createVenue();
        $customer = $this->createCustomer($venue, $user);
        $foreignReward = $this->createReward($otherVenue, ['required_stamps' => 5]);
        $this->createRewardCycle($customer);

        Sanctum::actingAs($user);

        $this->postJson("/api/customers/{$customer->id}/rewards/{$foreignReward->id}/redeem")
            ->assertStatus(422)
            ->assertJsonValidationErrors('reward');
    }

    public function test_customer_cannot_redeem_locked_reward(): void
    {
        $user = $this->createUser();
        $venue = $this->createVenue();
        $customer = $this->createCustomer($venue, $user, ['stamps' => 1]);
        $reward = $this->createReward($venue, ['required_stamps' => 5]);
        $this->createRewardCycle($customer);

        Sanctum::actingAs($user);

        $this->postJson("/api/customers/{$customer->id}/rewards/{$reward->id}/redeem")
            ->assertStatus(422)
            ->assertJsonValidationErrors('reward');
    }
}
