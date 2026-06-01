<?php

namespace Tests\Feature;

use App\Models\CustomerNote;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class VenueCustomerControllerTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    public function test_customer_list_includes_retention_fields_and_summary(): void
    {
        $owner = $this->createUser();
        $staff = $this->createUser(['email' => 'staff@example.com']);
        $guest = $this->createUser(['email' => 'guest@example.com', 'birthday' => '1990-05-15']);
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');
        $customer = $this->createCustomer($venue, $guest, ['stamps' => 3]);
        $reward = $this->createReward($venue, ['required_stamps' => 3]);
        $this->createVisit($customer, $staff, ['created_at' => now()->subDays(2)]);
        $this->createRewardUnlock($customer, $reward, [
            'claimed_at' => now()->subDay(),
            'claimed_by' => $staff->id,
        ]);

        Sanctum::actingAs($owner);

        $this->getJson("/api/venues/{$venue->id}/customers")
            ->assertOk()
            ->assertJsonPath('customers.0.visits_count', 1)
            ->assertJsonPath('customers.0.rewards_claimed_count', 1)
            ->assertJsonPath('customers.0.activity_status', 'active')
            ->assertJsonPath('customers.0.user.birthday', '1990-05-15')
            ->assertJsonStructure([
                'summary' => ['total', 'active', 'inactive', 'new', 'cooling'],
            ]);
    }

    public function test_customer_list_filters_inactive_customers(): void
    {
        $owner = $this->createUser();
        $staff = $this->createUser(['email' => 'staff@example.com']);
        $activeGuest = $this->createUser(['email' => 'active@example.com']);
        $inactiveGuest = $this->createUser(['email' => 'inactive@example.com']);
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');

        $activeCustomer = $this->createCustomer($venue, $activeGuest);
        $inactiveCustomer = $this->createCustomer($venue, $inactiveGuest, [
            'created_at' => now()->subDays(60),
        ]);

        $this->createVisit($activeCustomer, $staff, ['created_at' => now()->subDays(3)]);
        $this->createVisit($inactiveCustomer, $staff, ['created_at' => now()->subDays(45)]);

        Sanctum::actingAs($owner);

        $this->getJson("/api/venues/{$venue->id}/customers?activity=inactive")
            ->assertOk()
            ->assertJsonCount(1, 'customers')
            ->assertJsonPath('customers.0.user.email', 'inactive@example.com');
    }

    public function test_customer_profile_returns_timeline_visits_and_notes(): void
    {
        $owner = $this->createUser();
        $staff = $this->createUser(['email' => 'staff@example.com']);
        $guest = $this->createUser(['email' => 'guest@example.com']);
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');
        $customer = $this->createCustomer($venue, $guest, ['stamps' => 5]);
        $reward = $this->createReward($venue, ['required_stamps' => 5]);
        $this->createVisit($customer, $staff);
        $this->createRewardUnlock($customer, $reward, [
            'claimed_at' => now(),
            'claimed_by' => $staff->id,
        ]);

        CustomerNote::query()->create([
            'customer_id' => $customer->id,
            'author_id' => $owner->id,
            'body' => 'Regular — prefers oat milk lattes.',
        ]);

        Sanctum::actingAs($owner);

        $this->getJson("/api/venues/{$venue->id}/customers/{$customer->id}")
            ->assertOk()
            ->assertJsonPath('stats.visits_count', 1)
            ->assertJsonPath('stats.rewards_claimed_count', 1)
            ->assertJsonCount(1, 'visits')
            ->assertJsonCount(1, 'reward_history')
            ->assertJsonCount(1, 'notes')
            ->assertJsonPath('notes.0.body', 'Regular — prefers oat milk lattes.')
            ->assertJsonStructure([
                'timeline' => [
                    ['type', 'occurred_at', 'title'],
                ],
            ]);
    }

    public function test_owner_can_update_birthday_and_add_note(): void
    {
        $owner = $this->createUser();
        $guest = $this->createUser(['email' => 'guest@example.com']);
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');
        $customer = $this->createCustomer($venue, $guest);

        Sanctum::actingAs($owner);

        $this->patchJson("/api/venues/{$venue->id}/customers/{$customer->id}", [
            'birthday' => '1988-12-01',
        ])
            ->assertOk()
            ->assertJsonPath('customer.user.birthday', '1988-12-01');

        $this->postJson("/api/venues/{$venue->id}/customers/{$customer->id}/notes", [
            'body' => 'Ask about birthday reward in December.',
        ])
            ->assertCreated()
            ->assertJsonPath('notes.0.body', 'Ask about birthday reward in December.');

        $this->assertDatabaseHas('customer_notes', [
            'customer_id' => $customer->id,
            'author_id' => $owner->id,
        ]);
    }

    public function test_customer_profile_rejects_other_venue(): void
    {
        $owner = $this->createUser();
        $guest = $this->createUser(['email' => 'guest@example.com']);
        $venueA = $this->createVenue();
        $venueB = $this->createVenue();
        $this->attachMember($venueA, $owner, 'owner');
        $this->attachMember($venueB, $owner, 'owner');
        $customer = $this->createCustomer($venueB, $guest);

        Sanctum::actingAs($owner);

        $this->getJson("/api/venues/{$venueA->id}/customers/{$customer->id}")
            ->assertNotFound();
    }
}
