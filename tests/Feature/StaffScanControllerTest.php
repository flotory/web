<?php

namespace Tests\Feature;

use App\Models\CustomerRewardCycle;
use App\Models\RewardUnlock;
use Illuminate\Contracts\Broadcasting\Broadcaster;
use Illuminate\Contracts\Broadcasting\Factory as BroadcastFactory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Mockery;
use RuntimeException;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class StaffScanControllerTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    public function test_staff_can_add_a_stamp_and_unlock_a_reward(): void
    {
        $staff = $this->createUser(['email' => 'staff@example.com']);
        $customerUser = $this->createUser(['email' => 'customer@example.com']);
        $venue = $this->createVenue(['name' => 'Demo Cafe']);

        $this->attachMember($venue, $staff, 'staff');
        $customer = $this->createCustomer($venue, $customerUser, ['stamps' => 4]);
        $reward = $this->createReward($venue, [
            'title' => 'Free Flat White',
            'required_stamps' => 5,
            'sort_order' => 5,
        ]);

        Sanctum::actingAs($staff);

        $response = $this->postJson("/api/venues/{$venue->id}/scanner/stamps", [
            'qr_token' => $customer->qr_token,
            'stamps' => 1,
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('customer.id', $customer->id)
            ->assertJsonPath('customer.stamps', 0)
            ->assertJsonPath('cycle_completed', true)
            ->assertJsonPath('next_reward.id', $reward->id)
            ->assertJsonCount(1, 'available_rewards')
            ->assertJsonPath('available_rewards.0.id', $reward->id);

        $this->assertDatabaseHas('visits', [
            'customer_id' => $customer->id,
            'venue_id' => $venue->id,
            'created_by' => $staff->id,
        ]);

        $cycle = CustomerRewardCycle::query()
            ->where('customer_id', $customer->id)
            ->orderByDesc('cycle_number')
            ->firstOrFail();

        $this->assertSame(2, $cycle->cycle_number);
        $this->assertDatabaseHas('reward_unlocks', [
            'customer_id' => $customer->id,
            'reward_id' => $reward->id,
            'cycle_number' => 1,
        ]);
    }

    public function test_duplicate_scan_is_rejected_with_a_validation_error(): void
    {
        $staff = $this->createUser(['email' => 'scanner@example.com']);
        $customerUser = $this->createUser(['email' => 'guest@example.com']);
        $venue = $this->createVenue();

        $this->attachMember($venue, $staff, 'staff');
        $customer = $this->createCustomer($venue, $customerUser, ['stamps' => 1]);
        $this->createReward($venue);

        Sanctum::actingAs($staff);

        $firstResponse = $this->postJson("/api/venues/{$venue->id}/scanner/stamps", [
            'qr_token' => $customer->qr_token,
            'stamps' => 1,
        ]);

        $firstResponse->assertCreated();

        $secondResponse = $this->postJson("/api/venues/{$venue->id}/scanner/stamps", [
            'qr_token' => $customer->qr_token,
            'stamps' => 1,
        ]);

        $secondResponse
            ->assertStatus(422)
            ->assertJsonValidationErrors('qr_token');
    }

    public function test_staff_can_lookup_customer_by_qr(): void
    {
        $staff = $this->createUser();
        $customerUser = $this->createUser(['email' => 'guest@example.com']);
        $venue = $this->createVenue(['name' => 'Lookup Cafe']);

        $this->attachMember($venue, $staff, 'staff');
        $customer = $this->createCustomer($venue, $customerUser, ['stamps' => 2]);
        $this->createReward($venue, ['required_stamps' => 5]);

        Sanctum::actingAs($staff);

        $this->postJson("/api/venues/{$venue->id}/scanner/lookup", [
            'qr_token' => $customer->qr_token,
        ])
            ->assertOk()
            ->assertJsonPath('customer.id', $customer->id)
            ->assertJsonPath('customer.stamps', 2)
            ->assertJsonPath('next_reward.required_stamps', 5);
    }

    public function test_staff_can_add_multiple_stamps_in_one_scan(): void
    {
        $staff = $this->createUser();
        $customerUser = $this->createUser();
        $venue = $this->createVenue();

        $this->attachMember($venue, $staff, 'staff');
        $customer = $this->createCustomer($venue, $customerUser, ['stamps' => 2]);
        $this->createReward($venue, ['required_stamps' => 10]);

        Sanctum::actingAs($staff);

        $this->postJson("/api/venues/{$venue->id}/scanner/stamps", [
            'qr_token' => $customer->qr_token,
            'stamps' => 3,
        ])
            ->assertCreated()
            ->assertJsonPath('added_stamps', 3)
            ->assertJsonPath('customer.stamps', 5)
            ->assertJsonPath('cycle_completed', false);

        $this->assertDatabaseHas('visits', [
            'customer_id' => $customer->id,
            'created_by' => $staff->id,
        ]);
    }

    public function test_lookup_rejects_qr_token_from_another_venue(): void
    {
        $staff = $this->createUser();
        $customerUser = $this->createUser(['email' => 'guest@example.com']);
        $venueA = $this->createVenue(['name' => 'Venue A']);
        $venueB = $this->createVenue(['name' => 'Venue B']);
        $this->attachMember($venueA, $staff, 'staff');
        $customer = $this->createCustomer($venueB, $customerUser);

        Sanctum::actingAs($staff);

        $this->postJson("/api/venues/{$venueA->id}/scanner/lookup", [
            'qr_token' => $customer->qr_token,
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('qr_token');
    }

    public function test_add_stamp_succeeds_when_realtime_broadcast_fails(): void
    {
        config(['broadcasting.default' => 'reverb']);

        $broadcaster = Mockery::mock(Broadcaster::class);
        $broadcaster->shouldReceive('broadcast')->andThrow(new RuntimeException('Reverb unavailable'));

        $factory = Mockery::mock(BroadcastFactory::class);
        $factory->shouldReceive('connection')->andReturn($broadcaster);
        $this->app->instance(BroadcastFactory::class, $factory);

        $staff = $this->createUser();
        $customerUser = $this->createUser(['email' => 'guest@example.com']);
        $venue = $this->createVenue();
        $this->attachMember($venue, $staff, 'staff');
        $customer = $this->createCustomer($venue, $customerUser, ['stamps' => 1]);
        $this->createReward($venue);

        Sanctum::actingAs($staff);

        $this->postJson("/api/venues/{$venue->id}/scanner/stamps", [
            'qr_token' => $customer->qr_token,
            'stamps' => 1,
        ])
            ->assertCreated()
            ->assertJsonPath('customer.stamps', 2);

        $this->assertDatabaseHas('visits', [
            'customer_id' => $customer->id,
            'created_by' => $staff->id,
        ]);
    }

    public function test_add_stamp_rejects_qr_token_from_another_venue(): void
    {
        $staff = $this->createUser();
        $customerUser = $this->createUser(['email' => 'guest@example.com']);
        $venueA = $this->createVenue(['name' => 'Venue A']);
        $venueB = $this->createVenue(['name' => 'Venue B']);
        $this->attachMember($venueA, $staff, 'staff');
        $customer = $this->createCustomer($venueB, $customerUser);

        Sanctum::actingAs($staff);

        $this->postJson("/api/venues/{$venueA->id}/scanner/stamps", [
            'qr_token' => $customer->qr_token,
            'stamps' => 1,
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('qr_token');
    }
}
