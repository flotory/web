<?php

namespace Tests\Feature;

use App\Models\RedemptionRequest;
use App\Models\RewardUnlock;
use App\Support\LoyaltyQr;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class RedemptionClaimTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    public function test_customer_can_create_claim_session_and_staff_can_redeem(): void
    {
        $staff = $this->createUser(['email' => 'staff@example.com']);
        $customerUser = $this->createUser(['email' => 'guest@example.com']);
        $venue = $this->createVenue();
        $this->attachMember($venue, $staff, 'staff');

        $customer = $this->createCustomer($venue, $customerUser, ['stamps' => 5]);
        $reward = $this->createReward($venue, ['required_stamps' => 5]);
        $unlock = RewardUnlock::query()->create([
            'customer_id' => $customer->id,
            'reward_id' => $reward->id,
            'cycle_number' => 1,
            'unlocked_at' => now(),
        ]);

        Sanctum::actingAs($customerUser);

        $sessionResponse = $this->postJson("/api/customer/rewards/unlocks/{$unlock->id}/claim-session")
            ->assertCreated()
            ->assertJsonPath('status', 'pending')
            ->assertJsonPath('reward.id', $reward->id);

        $token = $sessionResponse->json('token');

        Sanctum::actingAs($staff);

        $this->postJson("/api/venues/{$venue->id}/scanner/redeem", [
            'redemption_token' => $token,
        ])
            ->assertCreated()
            ->assertJsonPath('scan_type', 'redeem')
            ->assertJsonPath('reward.id', $reward->id)
            ->assertJsonPath('customer.id', $customer->id);

        $unlock->refresh();
        $this->assertNotNull($unlock->claimed_at);
        $this->assertSame($staff->id, $unlock->claimed_by);

        Sanctum::actingAs($customerUser);

        $this->getJson("/api/customer/rewards/claim-sessions/{$token}")
            ->assertOk()
            ->assertJsonPath('status', 'claimed');
    }

    public function test_stamp_scan_includes_pending_claim_warning(): void
    {
        $staff = $this->createUser(['email' => 'staff@example.com']);
        $customerUser = $this->createUser(['email' => 'guest@example.com']);
        $venue = $this->createVenue();
        $this->attachMember($venue, $staff, 'staff');

        $customer = $this->createCustomer($venue, $customerUser, ['stamps' => 1]);
        $reward = $this->createReward($venue, ['required_stamps' => 5]);
        RewardUnlock::query()->create([
            'customer_id' => $customer->id,
            'reward_id' => $reward->id,
            'cycle_number' => 1,
            'unlocked_at' => now(),
        ]);

        Sanctum::actingAs($staff);

        $this->postJson("/api/venues/{$venue->id}/scanner/stamps", [
            'qr_token' => $customer->qr_token,
            'stamps' => 1,
        ])
            ->assertCreated()
            ->assertJsonPath('scan_type', 'stamp')
            ->assertJsonPath('pending_claim_warning.count', 1)
            ->assertJsonPath('pending_claim_warning.rewards.0.title', $reward->title);
    }

    public function test_expired_claim_token_is_rejected(): void
    {
        $staff = $this->createUser(['email' => 'staff@example.com']);
        $customerUser = $this->createUser(['email' => 'guest@example.com']);
        $venue = $this->createVenue();
        $this->attachMember($venue, $staff, 'staff');

        $customer = $this->createCustomer($venue, $customerUser);
        $reward = $this->createReward($venue);
        $unlock = RewardUnlock::query()->create([
            'customer_id' => $customer->id,
            'reward_id' => $reward->id,
            'cycle_number' => 1,
            'unlocked_at' => now(),
        ]);

        $request = RedemptionRequest::query()->create([
            'reward_unlock_id' => $unlock->id,
            'token' => (string) \Illuminate\Support\Str::uuid(),
            'expires_at' => now()->subMinute(),
        ]);

        Sanctum::actingAs($staff);

        $this->postJson("/api/venues/{$venue->id}/scanner/redeem", [
            'redemption_token' => $request->token,
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('redemption_token');
    }

    public function test_claim_session_qr_uses_flotory_payload(): void
    {
        $customerUser = $this->createUser();
        $venue = $this->createVenue();
        $customer = $this->createCustomer($venue, $customerUser);
        $reward = $this->createReward($venue);
        $unlock = RewardUnlock::query()->create([
            'customer_id' => $customer->id,
            'reward_id' => $reward->id,
            'cycle_number' => 1,
            'unlocked_at' => now(),
        ]);

        Sanctum::actingAs($customerUser);

        $response = $this->postJson("/api/customer/rewards/unlocks/{$unlock->id}/claim-session")
            ->assertCreated();

        $this->assertStringStartsWith('flotory:redeem:', $response->json('qr_value'));
    }

    public function test_unified_scan_endpoint_redeems_flotory_qr(): void
    {
        $staff = $this->createUser(['email' => 'staff@example.com']);
        $customerUser = $this->createUser(['email' => 'guest@example.com']);
        $venue = $this->createVenue();
        $this->attachMember($venue, $staff, 'staff');

        $customer = $this->createCustomer($venue, $customerUser);
        $reward = $this->createReward($venue);
        $unlock = RewardUnlock::query()->create([
            'customer_id' => $customer->id,
            'reward_id' => $reward->id,
            'cycle_number' => 1,
            'unlocked_at' => now(),
        ]);

        Sanctum::actingAs($customerUser);

        $qr = $this->postJson("/api/customer/rewards/unlocks/{$unlock->id}/claim-session")
            ->assertCreated()
            ->json('qr_value');

        Sanctum::actingAs($staff);

        $this->postJson("/api/venues/{$venue->id}/scanner/scan", ['scan' => $qr])
            ->assertCreated()
            ->assertJsonPath('scan_type', 'redeem')
            ->assertJsonPath('reward.id', $reward->id);
    }

    public function test_customer_cannot_create_claim_session_for_claimed_unlock(): void
    {
        $customerUser = $this->createUser();
        $venue = $this->createVenue();
        $customer = $this->createCustomer($venue, $customerUser);
        $reward = $this->createReward($venue);
        $unlock = RewardUnlock::query()->create([
            'customer_id' => $customer->id,
            'reward_id' => $reward->id,
            'cycle_number' => 1,
            'unlocked_at' => now(),
            'claimed_at' => now(),
        ]);

        Sanctum::actingAs($customerUser);

        $this->postJson("/api/customer/rewards/unlocks/{$unlock->id}/claim-session")
            ->assertStatus(422)
            ->assertJsonValidationErrors('unlock');
    }

    public function test_double_redeem_of_same_token_is_rejected(): void
    {
        $staff = $this->createUser(['email' => 'staff@example.com']);
        $customerUser = $this->createUser(['email' => 'guest@example.com']);
        $venue = $this->createVenue();
        $this->attachMember($venue, $staff, 'staff');

        $customer = $this->createCustomer($venue, $customerUser);
        $reward = $this->createReward($venue);
        $unlock = RewardUnlock::query()->create([
            'customer_id' => $customer->id,
            'reward_id' => $reward->id,
            'cycle_number' => 1,
            'unlocked_at' => now(),
        ]);

        Sanctum::actingAs($customerUser);

        $token = $this->postJson("/api/customer/rewards/unlocks/{$unlock->id}/claim-session")
            ->assertCreated()
            ->json('token');

        Sanctum::actingAs($staff);

        $this->postJson("/api/venues/{$venue->id}/scanner/redeem", [
            'redemption_token' => $token,
        ])->assertCreated();

        $this->postJson("/api/venues/{$venue->id}/scanner/redeem", [
            'redemption_token' => $token,
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('redemption_token');
    }
}
