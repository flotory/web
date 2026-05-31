<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class BroadcastAuthControllerTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    public function test_customer_can_authorize_their_loyalty_channel(): void
    {
        $user = $this->createUser();
        $venue = $this->createVenue();
        $customer = $this->createCustomer($venue, $user);

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/broadcasting/auth', [
            'socket_id' => '1234.5678',
            'channel_name' => "private-customer.{$customer->id}",
        ]);

        $response
            ->assertOk()
            ->assertJsonStructure(['auth']);

        $this->assertStringContainsString(':', $response->json('auth'));
    }

    public function test_customer_cannot_authorize_another_users_channel(): void
    {
        $owner = $this->createUser();
        $intruder = $this->createUser(['email' => 'intruder@example.com']);
        $venue = $this->createVenue();
        $customer = $this->createCustomer($venue, $owner);

        Sanctum::actingAs($intruder);

        $this->postJson('/api/broadcasting/auth', [
            'socket_id' => '1234.5678',
            'channel_name' => "private-customer.{$customer->id}",
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('channel_name');
    }

    public function test_unsupported_channel_name_is_rejected(): void
    {
        $user = $this->createUser();

        Sanctum::actingAs($user);

        $this->postJson('/api/broadcasting/auth', [
            'socket_id' => '1234.5678',
            'channel_name' => 'private-unsupported.1',
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('channel_name');
    }
}
