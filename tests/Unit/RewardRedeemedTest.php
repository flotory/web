<?php

namespace Tests\Unit;

use App\Events\RewardRedeemed;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class RewardRedeemedTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    public function test_broadcast_payload_includes_claim_session_token(): void
    {
        $user = $this->createUser();
        $venue = $this->createVenue(['name' => 'Demo Cafe']);
        $customer = $this->createCustomer($venue, $user);
        $reward = $this->createReward($venue, ['title' => 'Free Coffee']);
        $unlock = $this->createRewardUnlock($customer, $reward, ['claimed_at' => now()]);
        $unlock->load('reward');
        $customer->load('venue', 'user');

        $event = new RewardRedeemed($customer, $unlock, 'test-claim-token');
        $payload = $event->broadcastWith();

        $this->assertSame('reward.redeemed', $event->broadcastAs());
        $this->assertSame('test-claim-token', $payload['claim_session_token']);
        $this->assertSame('Free Coffee redeemed at Demo Cafe.', $payload['message']);
    }
}
