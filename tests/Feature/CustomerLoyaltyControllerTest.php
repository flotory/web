<?php

namespace Tests\Feature;

use App\Models\Venue;
use App\Support\CampaignTemplates;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
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
        $venue = $this->createVenue(['status' => Venue::STATUS_PUBLISHED]);

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

    public function test_card_does_not_unlock_until_next_stamp_when_unlock_row_missing(): void
    {
        $user = $this->createUser();
        $venue = $this->createVenue();
        $customer = $this->createCustomer($venue, $user, ['stamps' => 5]);
        $this->createReward($venue, ['required_stamps' => 5]);
        $this->createRewardCycle($customer);

        Sanctum::actingAs($user);

        $this->getJson("/api/customers/{$customer->id}/card")
            ->assertOk()
            ->assertJsonCount(0, 'pending_unlocks');

        app(\App\Services\LoyaltyStampService::class)->addStamp($customer->fresh(), $user, 1);

        $unlockId = $this->getJson("/api/customers/{$customer->id}/card")
            ->assertJsonCount(1, 'pending_unlocks')
            ->json('pending_unlocks.0.unlock_id');

        $this->postJson("/api/customer/rewards/unlocks/{$unlockId}/redeem")
            ->assertCreated()
            ->assertJsonPath('unlock.claimed_by', $user->id);
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
            ->assertJsonPath('cards.0.summary.stamps', 2)
            ->assertJsonPath('cards.0.summary.max_stamps', 5)
            ->assertJsonStructure([
                'journey',
                'recent_visits',
                'available_rewards',
                'cards' => [
                    ['summary' => ['stamps', 'max_stamps', 'pending_rewards_count', 'next_reward_title']],
                ],
            ]);

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
            ->assertJsonPath('items.0.unlock_id', fn ($value) => is_int($value))
            ->assertJsonPath('items.0.reward.id', $reward->id)
            ->assertJsonPath('items.0.customer.id', $customer->id);

        $this->getJson('/api/customer/cards')
            ->assertOk()
            ->assertJsonPath('pending_rewards_count', 1);
    }

    public function test_wallet_lists_each_unclaimed_unlock_even_for_the_same_reward(): void
    {
        $user = $this->createUser();
        $venue = $this->createVenue();
        $customer = $this->createCustomer($venue, $user, ['stamps' => 0]);
        $reward = $this->createReward($venue, [
            'title' => 'Free Latte',
            'required_stamps' => 5,
        ]);
        $this->createRewardCycle($customer, ['cycle_number' => 3, 'completed_at' => now()]);
        $this->createRewardUnlock($customer, $reward, ['cycle_number' => 1]);
        $this->createRewardUnlock($customer, $reward, ['cycle_number' => 2]);

        Sanctum::actingAs($user);

        $this->getJson('/api/customer/rewards/wallet')
            ->assertOk()
            ->assertJsonPath('pending_count', 2)
            ->assertJsonCount(2, 'items')
            ->assertJsonPath('items.0.reward.id', $reward->id)
            ->assertJsonPath('items.1.reward.id', $reward->id);
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

    public function test_customer_cannot_join_unpublished_venue(): void
    {
        $user = $this->createUser();
        $venue = $this->createVenue(['status' => Venue::STATUS_DRAFT]);

        Sanctum::actingAs($user);

        $this->postJson("/api/venues/{$venue->slug}/join")
            ->assertStatus(422)
            ->assertJsonValidationErrors('venue');
    }

    public function test_cards_list_includes_claimed_history(): void
    {
        $user = $this->createUser();
        $venue = $this->createVenue(['name' => 'History Cafe']);
        $customer = $this->createCustomer($venue, $user, ['stamps' => 0]);
        $reward = $this->createReward($venue, ['title' => 'Free Latte', 'required_stamps' => 5]);
        $this->createRewardUnlock($customer, $reward, [
            'claimed_at' => now()->subDay(),
            'claimed_by' => $user->id,
        ]);

        Sanctum::actingAs($user);

        $this->getJson('/api/customer/cards')
            ->assertOk()
            ->assertJsonCount(1, 'claimed_history')
            ->assertJsonPath('claimed_history.0.title', 'Free Latte')
            ->assertJsonPath('claimed_history.0.card_id', $customer->id);
    }

    public function test_cards_list_includes_promotion_and_home_campaigns(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-02 12:00:00'));

        try {
            $owner = $this->createUser();
            $user = $this->createUser(['email' => 'cards-promo@example.com']);
            $venue = $this->createPublishedVenue(['name' => 'Promo Cafe']);
            $this->attachMember($venue, $owner, 'owner');
            $customer = $this->createCustomer($venue, $user, ['stamps' => 2]);
            $this->createReward($venue, ['required_stamps' => 5]);
            $this->createRewardCycle($customer);

            $this->seedActiveCampaign($venue, $owner, CampaignTemplates::QUIET_DAY, [
                'stamp_multiplier' => 2,
                'days_of_week' => [2],
            ]);

            Sanctum::actingAs($user);

            $this->getJson('/api/customer/cards')
                ->assertOk()
                ->assertJsonPath('cards.0.promotion.multiplier', 2)
                ->assertJsonPath('cards.0.promotion.applies_now', true)
                ->assertJsonPath('promotion.multiplier', 2)
                ->assertJsonCount(1, 'home_campaigns')
                ->assertJsonPath('home_campaigns.0.venue_name', 'Promo Cafe')
                ->assertJsonPath('home_campaigns.0.applies_now', true);
        } finally {
            Carbon::setTestNow();
        }
    }

}
